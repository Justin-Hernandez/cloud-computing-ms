const express = require('express');
const mongodb = require('mongodb');
const jsonSchemaValidator = require('jsonschema');
const bodyParser = require('body-parser');

const MONGO_SERVICE = process.env.MONGO_SERVICE
const MONGO_PORT = process.env.MONGO_PORT
const MONGO_USERNAME = process.env.MONGO_USERNAME
const MONGO_PASSWORD = process.env.MONGO_PASSWORD

const connectionString = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_SERVICE}:${MONGO_PORT}`

const app = express();
const mongoClient = new mongodb.MongoClient(connectionString);
const validator = new jsonSchemaValidator.Validator();

//ejecuta el pipeline pasado como parametro en mongoDB
async function queryMongo(pipeline) {
    try {
        await mongoClient.connect();

        const database = mongoClient.db("proyecto_contenedores");
        const messages = database.collection("users");

        const cursor = messages.aggregate(pipeline);

        //response array
        let response = []
        await cursor.forEach(function (doc) { response.push(doc) })

        return response;
    } finally {
        await mongoClient.close();
    }
}

//inserta un documento en mongoDB
async function insertOneMongo(document) {
    try {
        await mongoClient.connect();

        const database = mongoClient.db("proyecto_contenedores");
        const messages = database.collection("users");

        let res = await messages.insertOne(document);

        return res.acknowledged;

    } finally {
        await mongoClient.close();
    }
}

function badRequestMessage(moreInformation) {
    return {
        httpCode: 400,
        httpMessage: "Bad Request",
        moreInformation: moreInformation
    }
}

//devuelve todos los usuarios en el sistema
app.get('/users', function (req, res) {
    let pipeline = [
        {
            $match: {}
        },
        {
            $project: {
                _id: 0,
                password: 0
            }
        }
    ]

    queryMongo(pipeline).then(function (resultado) {

        if(resultado.length === 0)
        {
            res.send([])
        }else
        {
            res.send(resultado);
        }
    });
})

//crea un nuevo usuario
app.post('/users', bodyParser.json(), function (req, res) {

    //requiere header content-type y que sea application/json para bodyParser.json()
    if (req.headers['content-type'] !== 'application/json') {
        return res.send(badRequestMessage('Content-Type header must be application/json'))
    }

    //json schema para validar el cuerpo de la peticion
    const schema = {
        type: 'object',
        properties: {
            name: {
                type: 'string'
            },
            password: {
                type: 'string'
            }
        },
        required: ['name', 'password']
    }

    let validation = validator.validate(req.body, schema);

    //si es valido
    if (validation.valid) {
        queryMongo([{ $match: {name: req.body.name}}]).then(function (resultado) {
            //ha encontrado un usuario con ese nombre
            if (resultado.length > 0) {
                return res.send(badRequestMessage(`A user with name '${req.body.name}' already exists`))
            } else {
                insertOneMongo({
                    ...req.body,
                    date: new Date()
                }).then(function (acknowledged) {
                    if (acknowledged) {
                        res.statusCode = 201;
                        res.send({
                            "message": "created"
                        })
                    } else {
                        res.statusCode = 500;
                        res.send({
                            httpCode: 500,
                            httpMessage: "Internal Server Error",
                            moreInformation: 'Document insertion failed'
                        })
                    }
                })
            }
        })
    } else {
        res.statusCode = 400;
        return res.send({
            ...badRequestMessage("See the 'errors' field for more information"),
            errors: validation.errors.map(function (error) {
                let responseElement = {
                    "target": error.property.replace('instance', 'body'),
                    "message": error.message
                }
                return responseElement;
            })
        });
    }
})

//devuelve informacion sobre un usuario especifico
app.get('/users/:user', function (req, res) {

    let pipeline = [
        {
            $match: {
                name: req.params.user
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ]

    queryMongo(pipeline).then(function (resultado) {

        if (resultado.length > 0) {
            res.send(resultado[0])
        } else {
            res.statusCode = 404
            res.send({
                httpCode: 404,
                httpMessage: 'Not Found',
                moreInformation: `User with name '${req.params.user}' was not found`
            })
        }
    });
})

app.listen(5001)