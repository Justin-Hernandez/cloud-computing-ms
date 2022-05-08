const express = require('express');
const jsonSchemaValidator = require('jsonschema');
const bodyParser = require('body-parser');
const redis = require('redis');
const uuid = require('uuid').v4;
const axios = require('axios');

const app = express();
const validator = new jsonSchemaValidator.Validator();

const REDIS_SERVICE = process.env.REDIS_SERVICE
const REDIS_SERVICE_PORT = process.env.REDIS_SERVICE_PORT

const redisConnectionString = `redis://${REDIS_SERVICE}:${REDIS_SERVICE_PORT}`

const USER_SERVICE = process.env.USER_SERVICE
const USER_SERVICE_PORT = process.env.USER_SERVICE_PORT

const user_service_url = `http://${USER_SERVICE}:${USER_SERVICE_PORT}`

const redisClient = redis.createClient({
    url: redisConnectionString
})

async function getRedis(key) {
    try {

        await redisClient.connect();

        return await redisClient.get(key);
    } finally {
        await redisClient.quit()
    }
}

async function setRedis(key, value) {
    try {

        await redisClient.connect();
        await redisClient.set(key, value);
        await redisClient.expire(key, 3600);

    } finally {
        await redisClient.quit();
    }
}

async function findUser(username, headers) {
    try {

        return await axios.get(`${user_service_url}/users/${username}`, {headers: headers});

    } catch (error) {
        return error
    }
}

function badRequestMessage(moreInformation) {
    return {
        httpCode: 400,
        httpMessage: "Bad Request",
        moreInformation: moreInformation
    }
}

function unauthorized() {
    return {
        httpCode: 401,
        httpMessage: "Unauthorized",
        moreInformation: "Invalid user or password"
    }
}

app.post('/login', bodyParser.json(), function (req, res) {

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
            user: {
                type: 'string'
            },
            password: {
                type: 'string'
            }
        },
        required: ['user', 'password']
    }

    let validation = validator.validate(req.body, schema);

    //si es valido
    if (validation.valid) {

        findUser(req.body.user, headers).then(function (response) {

            //el servicio ha encontrado el usuario
            if (response.status === 200) {

                //si contraseña valida
                if (response.data.password === req.body.password) {
                    const token = uuid();
                    setRedis(token, req.body.user)

                    res.statusCode = 200;
                    res.send({
                        token: token
                    })
                } else {
                    res.statusCode = 401;
                    res.send(unauthorized())
                }
            } else {
                res.statusCode = 401;
                res.send(unauthorized())
            }
        });
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

app.get('/verify/:token', function (req, res) {

    getRedis(req.params.token).then(function(result){

        if(result === null)
        {
            res.statusCode = 404;
            res.send({
                httpCode: 404,
                httpMessage: 'Not Found',
                moreInformation: 'Authentication token not found'
            })
        }else
        {
            res.statusCode = 200;
            res.send({
                user: result
            })
        }
    })
})

app.listen(5002);