const jwt = require('jsonwebtoken')

const secret = "MySecret"

function generateAuthToken(userId, admin){
    const payload = {sub: userId, ad: admin}
    return jwt.sign(payload, secret, {expiresIn: '24h'})
}

exports.generateAuthToken = generateAuthToken

function requireAuthentication(req, res, next){
    const authHeader = req.get('authorization') || ''
    const authParts = authHeader.split(' ')
    const token = authParts[0] === 'Bearer' ? authParts[1] : null

    try{
    const payload = jwt.verify(token, secret)
    console.log("payload.sub:", payload.sub)
    console.log("payload.ad:", payload.ad)
    req.user = payload.sub
    req.admin = payload.ad
    next()
    } catch (err){
        res.status(401).send({
            err: "invalid auth"
        })
    }
}

exports.requireAuthentication = requireAuthentication