const express = require('express');
const mongodb = require('mongodb');
const jsonSchemaValidator = require('jsonschema');
const bodyParser = require('body-parser');
const axios = require('axios');

const MONGO_SERVICE = process.env.MONGO_SERVICE
const MONGO_PORT = process.env.MONGO_PORT
const MONGO_USERNAME = process.env.MONGO_USERNAME
const MONGO_PASSWORD = process.env.MONGO_PASSWORD

const connectionString = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_SERVICE}:${MONGO_PORT}`

const USER_SERVICE = process.env.USER_SERVICE
const USER_SERVICE_PORT = process.env.USER_SERVICE_PORT

const user_service_url = `http://${USER_SERVICE}:${USER_SERVICE_PORT}`

console.log(`MongoDB URL: ${connectionString}`)
console.log(`User service URL: ${user_service_url}`)

const app = express();
const mongoClient = new mongodb.MongoClient(connectionString);
const validator = new jsonSchemaValidator.Validator();

//ejecuta el pipeline pasado como parametro en mongoDB
async function queryMongo(pipeline) {
    try {
        await mongoClient.connect();

        const database = mongoClient.db("proyecto_contenedores");
        const messages = database.collection("messages");

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
        const messages = database.collection("messages");

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

app.get('/messages/:user', function (req, res) {

    let headers = req.headers
    delete headers['content-length']
    delete headers['connection']
    delete headers['host']
    
    //selecciona documentos que tengan el usuario expecificado en la cabecera "user"
    //y elimina el campo _id de los documentos devueltos
    let pipeline = [
        {
            $match: {
                to: req.params.user
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ];

    axios.get(`${user_service_url}/users/${req.params.user}`, {headers: headers}).then(function (result) {
        //el usuario existe, busca sus mensajes en mongodb
        queryMongo(pipeline).then(function (resultado) {
            res.send(resultado);
        });
    }).catch(function (error) {
        res.statusCode = error.response !== undefined ? error.response.status : 503
        res.send(error.response !== undefined ? error.response.data : {
            httpCode: 503,
            httpMessage: 'Service Unavailable',
            moreInformation: `Error llamando al servicio de usarios: ${error.code}`
        })
    })
})

app.post('/messages/:user', bodyParser.json(), function (req, res) {

    let headers = req.headers
    delete headers['content-length']
    delete headers['connection']
    delete headers['host']

    //requiere header content-type y que sea application/json para bodyParser.json()
    if (req.headers['content-type'] !== 'application/json') {
        return res.send(badRequestMessage('Content-Type header must be application/json'))
    }

    //json schema para validar el cuerpo de la peticion
    const schema = {
        type: 'object',
        properties: {
            to: {
                type: 'string'
            },
            msg: {
                type: 'string'
            }
        },
        required: ['to', 'msg']
    }

    let validation = validator.validate(req.body, schema);

    //si es valido
    if (validation.valid) {

        //comprueba si el usuario en la url existe
        axios.get(`${user_service_url}/users/${req.params.user}`, {headers: headers}).then(function (result) {
            //comprueba si el usuario en el cuerpo de la peticion existe
            axios.get(`${user_service_url}/users/${req.body.to}`, {headers: headers}).then(function (result2) {

                insertOneMongo({
                    from: req.params.user,
                    to: req.body.to,
                    msg: req.body.msg,
                    date: new Date()
                }).then(function (resultado) {
                    if (resultado) {
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

            }).catch(function (error) {
                res.statusCode = error.response !== undefined ? error.response.status : 503
                res.send(error.response !== undefined ? error.response.data : {
                    httpCode: 503,
                    httpMessage: 'Service Unavailable',
                    moreInformation: `Error llamando al servicio de usarios: ${error.code}`
                })
            })
        }).catch(function (error) {
            res.statusCode = error.response !== undefined ? error.response.status : 503
            res.send(error.response !== undefined ? error.response.data : {
                httpCode: 503,
                httpMessage: 'Service Unavailable',
                moreInformation: `Error llamando al servicio de usarios: ${error.code}`
            })
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

app.listen(5000);