const express = require('express');
const jsonSchemaValidator = require('jsonschema');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();
const validator = new jsonSchemaValidator.Validator();

const USER_SERVICE = process.env.USER_SERVICE
const USER_SERVICE_PORT = process.env.USER_SERVICE_PORT

const user_service_url = `http://${USER_SERVICE}:${USER_SERVICE_PORT}`

const MESSAGE_SERVICE = process.env.MESSAGE_SERVICE
const MESSAGE_SERVICE_PORT = process.env.MESSAGE_SERVICE_PORT

const message_service_url = `http://${MESSAGE_SERVICE}:${MESSAGE_SERVICE_PORT}`

const AUTH_SERVICE = process.env.AUTH_SERVICE
const AUTH_SERVICE_PORT = process.env.AUTH_SERVICE_PORT

const auth_service_url = `http://${AUTH_SERVICE}:${AUTH_SERVICE_PORT}`

function badRequestMessage(moreInformation) {
    return {
        httpCode: 400,
        httpMessage: "Bad Request",
        moreInformation: moreInformation
    }
}

function unauthorized(message) {
    return {
        httpCode: 401,
        httpMessage: "Unauthorized",
        moreInformation: message
    }
}

function badRequestMessage(moreInformation) {
    return {
        httpCode: 400,
        httpMessage: "Bad Request",
        moreInformation: moreInformation
    }
}

//devuelve token al iniciar sesion correctamente
app.post('/login', bodyParser.json(), function (req, res) {

    let headers = req.headers
    delete headers['content-length']
    delete headers['connection']
    delete headers['host']

    //peticion directa al servicio
    axios.post(`${auth_service_url}/login`, {
        user: req.body.user,
        password: req.body.password
    },{headers: headers}).then(function (result) {
        //passthrough del /login de auth-service
        res.statusCode = result.status;
        res.send(result.data);
    }).catch(function (error) {
        res.statusCode = error.response !== undefined ? error.response.status : 503
        res.send(error.response !== undefined ? error.response.data : {
            httpCode: 503,
            httpMessage: 'Service Unavailable',
            moreInformation: `Error llamando al servicio de usarios: ${error.code}`
        })
    });
})

//devuelve los mensajes del usuario al que pertenece el token en el header 'Authorization'
app.get('/messages', function (req, res) {

    let headers = req.headers
    delete headers['content-length']
    delete headers['connection']
    delete headers['host']

    if (req.headers.authorization !== undefined) {
        //verifica el token
        axios.get(`${auth_service_url}/verify/${req.headers.authorization}`, {headers: headers}).then(function (result) {

            //peticion directa al servicio
            axios.get(`${message_service_url}/messages/${result.data.user}`, {headers: headers}).then(function (result2) {
                res.statusCode = result2.status
                res.send(result2.data)
            }).catch(function (error) {
                res.statusCode = error.response !== undefined ? error.response.status : 503
                res.send(error.response !== undefined ? error.response.data : {
                    httpCode: 503,
                    httpMessage: 'Service Unavailable',
                    moreInformation: `Error llamando al servicio de mensajes: ${error.code}`
                })
            })
        }).catch(function (error) {
            res.statusCode = error.response !== undefined ? error.response.status : 503
            res.send(error.response !== undefined ? error.response.data : {
                httpCode: 503,
                httpMessage: 'Service Unavailable',
                moreInformation: `Error llamando al servicio de autenticacion: ${error.code}`
            })
        })
    } else {
        res.statusCode = 401
        res.send(unauthorized("Missing the authorization header"))
    }
})

//envia un mensaje
app.post('/messages', bodyParser.json(), function (req, res) {

    let headers = req.headers
    delete headers['content-length']
    delete headers['connection']
    delete headers['host']

    if (req.headers.authorization !== undefined) {
        //verifica el token
        axios.get(`${auth_service_url}/verify/${req.headers.authorization}`, {headers: headers}).then(function (result) {

            //peticion directa al servicio
            axios.post(`${message_service_url}/messages/${result.data.user}`, {
                ...req.body
            }, {headers: headers}).then(function (result2) {
                res.statusCode = result2.status
                res.send(result2.data)
            }).catch(function (error) {
                res.statusCode = error.response !== undefined ? error.response.status : 503
                res.send(error.response !== undefined ? error.response.data : {
                    httpCode: 503,
                    httpMessage: 'Service Unavailable',
                    moreInformation: `Error llamando al servicio de mensajes: ${error.code}`
                })
            })
        }).catch(function (error) {
            res.statusCode = error.response !== undefined ? error.response.status : 503
            res.send(error.response !== undefined ? error.response.data : {
                httpCode: 503,
                httpMessage: 'Service Unavailable',
                moreInformation: `Error llamando al servicio de autenticacion: ${error.code}`
            })
        })
    } else {
        res.statusCode = 401
        res.send(unauthorized("Missing the authorization header"))
    }
})

//devuelve la lista de usuarios del sistema
app.get('/users', function (req, res) {

    let headers = req.headers
    delete headers['content-length']
    delete headers['connection']
    delete headers['host']

    if (req.headers.authorization !== undefined) {

        //verifica el token
        axios.get(`${auth_service_url}/verify/${req.headers.authorization}`, {headers: headers}).then(function (result) {
            axios.get(`${user_service_url}/users`, {headers: headers}).then(function (result) {
                res.statusCode = result.status
                res.send(result.data)
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
                moreInformation: `Error llamando al servicio de autenticacion: ${error.code}`
            })
        })
    } else {
        res.statusCode = 401
        res.send(unauthorized("Missing the authorization header"))
    }
})

//crea un nuevo usuario con los datos informados en el cuerpo de la peticion
app.post('/sign-up', bodyParser.json(), function (req, res) {

    let headers = req.headers
    delete headers['content-length']
    delete headers['connection']
    delete headers['host']
    
    //peticion directa al servicio de usuarios
    axios.post(`${user_service_url}/users`, {
        ...req.body
    }, {headers: headers}).then(function (result2) {
        res.statusCode = result2.status
        res.send(result2.data)
    }).catch(function (error) {
        res.statusCode = error.response !== undefined ? error.response.status : 503
        res.send(error.response !== undefined ? error.response.data : {
            httpCode: 503,
            httpMessage: 'Service Unavailable',
            moreInformation: `Error llamando al servicio de usarios: ${error.code}`
        })
    })
})

app.get('/health', function(req, res){
    res.statusCode = 200
    res.send({
        "status": "up and running"
    })
})

app.listen(5003)