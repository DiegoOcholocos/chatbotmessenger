require("dotenv").config();
import request from "request";

let postWebhook = (req, res) => {
    // Analiza el cuerpo de la solicitud POST
    let body = req.body;

    // Verifica que el evento de webhook provenga de una suscripción a la página
    if (body.object === 'page') {

        // Itera sobre cada entrada, puede haber múltiples si están en lotes
        body.entry.forEach(function (entry) {

            // Obtiene el cuerpo del evento de webhook
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);

            // Obtiene el ID del remitente (PSID)
            let sender_psid = webhook_event.sender.id;
            console.log('Sender PSID: ' + sender_psid);

            // Verifica si el evento es un mensaje o un postback y
            // pasa el evento a la función manejadora adecuada
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }

        });

        // Devuelve una respuesta '200 OK' para todos los eventos
        res.status(200).send('EVENT_RECEIVED');

    } else {
        // Devuelve un '404 Not Found' si el evento no proviene de una suscripción a la página
        res.sendStatus(404);
    }
};

let getWebhook = (req, res) => {
    // Tu token de verificación. Debería ser una cadena aleatoria.
    let VERIFY_TOKEN = process.env.MY_VERIFY_FB_TOKEN;

    // Analiza los parámetros de la consulta
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Verifica si un token y modo están en la cadena de consulta de la solicitud
    if (mode && token) {

        // Verifica que el modo y el token enviados sean correctos
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Responde con el token de desafío de la solicitud
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responde con '403 Forbidden' si los tokens de verificación no coinciden
            res.sendStatus(403);
        }
    }
};

// Maneja eventos de mensajes
function handlePostback(sender_psid, received_postback) {
    let response;

    // Obtiene la carga útil del postback
    let payload = received_postback.payload;

    // Establece la respuesta según la carga útil del postback
    if (payload === 'yes') {
        response = { "text": "¡Gracias!" }
    } else if (payload === 'no') {
        response = { "text": "¡Oops, intenta enviar otra imagen!" }
    }
    // Envía el mensaje para confirmar el postback
    callSendAPI(sender_psid, response);
}

// Envía mensajes de respuesta a través de la API de envío
function callSendAPI(sender_psid, response) {
    // Construye el cuerpo del mensaje
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": { "text": response }
    };

    // Envía la solicitud HTTP a la plataforma de Messenger
    request({
        "uri": "https://graph.facebook.com/v7.0/me/messages",
        "qs": { "access_token": process.env.FB_PAGE_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        if (!err) {
            console.log('¡Mensaje enviado!');
        } else {
            console.error("No se pudo enviar el mensaje:" + err);
        }
    });
}

// Maneja eventos de mensajes_postbacks
function handleMessage(sender_psid, message) {
    // Maneja mensajes para reacciones, como presionar el botón de "me gusta"
    // ID del botón de "me gusta": sticker_id 369239263222822

    if (message && message.attachments && message.attachments[0].payload) {
        callSendAPI(sender_psid, "¡Gracias por ver mi video!");
        callSendAPIWithTemplate(sender_psid);
        return;
    }

    let entitiesArr = ["wit$hola", "wit$gracias", "wit$adios"];
    let entityChosen = "";
    entitiesArr.forEach((name) => {
        let entity = firstTrait(message.nlp, name);
        if (entity && entity.confidence > 0.8) {
            entityChosen = name;
        }
    });

    if (entityChosen === "") {
        // Por defecto
        callSendAPI(sender_psid, `El bot necesita más entrenamiento. Intenta decir "gracias" o "hola" al bot`);
    } else {
        if (entityChosen === "wit$hola") {
            // Envía un mensaje de saludo
            callSendAPI(sender_psid, '¡Hola! Este bot fue creado por Hary Pham. ¡Mira más videos en el canal de HaryPhamDev!');
        }
        if (entityChosen === "wit$gracias") {
            // Envía un mensaje de agradecimiento
            callSendAPI(sender_psid, '¡De nada!');
        }
        if (entityChosen === "wit$adios") {
            // Envía un mensaje de despedida
            callSendAPI(sender_psid, '¡Adiós!');
        }
    }
}

// Llama a la API de envío con una plantilla
let callSendAPIWithTemplate = (sender_psid) => {
    // Documentación de la plantilla de mensajes de Facebook
    // https://developers.facebook.com/docs/messenger-platform/send-messages/templates
    let body = {
        "recipient": {
            "id": sender_psid
        },
        "message": {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [
                        {
                            "title": "¿Quieres construir algo increíble?",
                            "image_url": "https://www.nexmo.com/wp-content/uploads/2018/10/build-bot-messages-api-768x384.png",
                            "subtitle": "Mira más videos en mi canal de YouTube ^^",
                            "buttons": [
                                {
                                    "type": "web_url",
                                    "url": "https://bit.ly/subscribe-haryphamdev",
                                    "title": "Mira ahora"
                                }
                            ]
                        }
                    ]
                }
            }
        }
    };

    request({
        "uri": "https://graph.facebook.com/v6.0/me/messages",
        "qs": { "access_token": process.env.FB_PAGE_TOKEN },
        "method": "POST",
        "json": body
    }, (err, res, body) => {
        if (!err) {
            // console.log('¡Mensaje enviado!')
        } else {
            console.error("No se pudo enviar el mensaje:" + err);
        }
    });
};

module.exports = {
    postWebhook: postWebhook,
    getWebhook: getWebhook
};