import { addUserToGuild, exchangeCode, getAccessToken, getUserInfo } from "./util/discord";
import config from '../config.json';
import { urlencoded } from "body-parser";
import cookies from 'cookie-parser'
import fs from 'fs'
import path from 'path'

import express from 'express';
const app = express();

// ***REMOVED***

const refreshTokenMaxAge = 1000 * 60 * 60 * 24 * 7 * 2; // two weeks

app.use(cookies())
app.use(urlencoded({ extended: true }))

app.get('/api/oauth2/exchange', async (req, res) => {
    let code = req.query?.code;
    if (!code) return res.send('code is undefined')

    let codeRes = await exchangeCode(code.toString());
    res.cookie('refresh_token', codeRes['refresh_token'], {
        httpOnly: true,
        secure: req.secure,
        maxAge: refreshTokenMaxAge
    });

    res.cookie('access_token', codeRes['access_token'], {
        httpOnly: true,
        secure: req.secure,
        maxAge: codeRes['expires_in']
    });

    res.redirect('/success')
});

app.get('/api/oauth2/refresh', async (req, res) => {
    const redirectURL = req.query['redirect-uri'];
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) return res.redirect(config.authUrl);

    let aT = await getAccessToken(refreshToken);

    res.cookie('access_token', aT['access_token'], {
        httpOnly: true,
        secure: req.secure,
        maxAge: aT['expires_in']
    });
    res.cookie('refresh_token', aT['refresh_token'], {
        httpOnly: true,
        secure: req.secure,
        maxAge: refreshTokenMaxAge
    });

    if (redirectURL) res.redirect(redirectURL.toString());
    else res.redirect('/success');
});

app.get('/api/oauth2/user', async (req, res) => {
    const redirectURL = req.query['redirect-uri']
    const accessToken = req.cookies?.access_token;
    if (!accessToken) return res.json({ error: 'no access token' }) && res.status(401);

    let aT = await getUserInfo(accessToken);
    res.json(aT);
    res.status(200);

    if (redirectURL) res.redirect(redirectURL.toString());
});

app.get('/api/oauth2/joinserver', async (req, res) => {
    const redirectURL = req.query['redirect-uri']
    const accessToken = req.cookies?.access_token;
    if (!accessToken) return res.send('no access token') && res.status(401);

    const guildId = req.query['guild-id'];
    if (!guildId) return res.status(400);

    try {
        let response = await addUserToGuild(accessToken, guildId.toString(), (await getUserInfo(accessToken)).id);
        res.json(response);
    } catch {
        res.json({error: 'invalid guild id'})
        res.status(400)
    } finally {
        if (redirectURL) res.redirect(redirectURL.toString());
    }
});

app.get('/api/oauth2/hasauthorized', (req, res) => {
    const refreshToken = req.cookies?.refresh_token;
    const accessToken = req.cookies?.access_token;
    if (!refreshToken) res.status(400);
    else if (!accessToken) res.status(404);
    else res.status(200)
    res.end()
});

app.get('/api/oauth2/authurl', (req, res) => {
    if (req.query['redirect'] == 'true') res.redirect(config.authUrl)
    else res.send(config.authUrl)
    res.end()
});

app.get('/api/oauth2/authurlwbot', (req, res) => {
    if (req.query['redirect'] == 'true') res.redirect(config.authUrlwBot)
    else res.send(config.authUrlwBot)
    res.end()
});

app.get('/**', (req, res) => {
    let url = path.join(__dirname, "/routes/", req.url);
    let url_html = path.join(__dirname, "/routes/", req.url + ".html");

    if (fs.existsSync(url)) {
        let data = fs.readFileSync(url);
        res.type('text/html')
        res.send(data.toString());
    } else {
        if (fs.existsSync(url_html)) {
            let html = fs.readFileSync(url_html).toString();
            res.type(".html");
            res.send(html);
        }
        else {
            let notfound = fs.readFileSync(path.join(__dirname, "/routes/404.html"))
            res.type('.html');
            res.send(notfound);
        };
    }
})

app.listen(config.port, () => console.log('Webserver started.'));