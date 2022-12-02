import { request } from 'undici';
import config from '../../config.json'

export const BASE_API_ROUTE = "https://discord.com/api/v10/";
export const GEN_API_ROUTE = (route: string): string => (BASE_API_ROUTE + route).replace(/(?<!:)\/(?=\/)/g, '');

export async function getRequest(url: string, headers: object = {}, json = true) {
    let data = (await request(url, {
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    })).body;

    if (json) return await data.json();
    else return data;
}

export async function makeRequest(data: object, url: string, headers: object = {}, method: 'POST' | 'PUT' = 'POST') {
    return await ((await request(url, {
        method: method,
        body: JSON.stringify(data),
        headers: {
            "Content-Type": "application/json",
            ...headers
        }
    })).body.json());
}

// application/x-www-form-urlencoded
export async function makeURLEncodedRequest(data: object, url: string, headers: object = {}, method: 'POST' | 'PUT' = 'POST') {
    return await ((await request(url, {
        method: method,
        body: new URLSearchParams({ ...data }).toString(),
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...headers
        }
    })).body.json());
}



export async function exchangeCode(code: string) {
    let data = {
        "client_id": config.clientId,
        "client_secret": config.clientSecret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": `http://localhost:53134/api/oauth2/exchange`
    }

    return await makeURLEncodedRequest(data, GEN_API_ROUTE('/oauth2/token'))
}

export async function getAccessToken(refreshToken: string) {
    let data = {
        'client_id': config.clientId,
        'client_secret': config.clientSecret,
        'grant_type': 'refresh_token',
        'refresh_token': refreshToken
    }

    return await makeURLEncodedRequest(data, GEN_API_ROUTE('/oauth2/token'))
}

export async function addUserToGuild(access_token: string, guildId: string, userId: string) {
    return await makeRequest(
        {
            "access_token": access_token
        },
        GEN_API_ROUTE(`/guilds/${guildId}/members/${userId}`),
        {
            "Authorization": `Bot ${config.botToken}`,
        },
        'PUT')
}

interface UserInfo {
    id: string,
    username: string,
    discriminator: string,
    avatar: string,
    verified: boolean,
    email: string,
    flags: number,
    banner: string,
    accent_color: number,
    premium_type: number,
    public_flags: number
}

const UserCache = new Map();

export async function getUserInfo(access_token: string): Promise<UserInfo> {
    if (!UserCache.has(access_token)) {
        const url = GEN_API_ROUTE(`/users/@me`);

        let data: UserInfo = await getRequest(url, {
            "Authorization": `Bearer ${access_token}`
        });

        UserCache.set(access_token, data)
        setTimeout(() => UserCache.delete(access_token), 1000 * 60 * 30)
        return data;
    } else {
        return UserCache.get(access_token);
    }
}

export async function getAvatar(access_token: string): Promise<string> {
    let userInfo = await getUserInfo(access_token);
    let userId = userInfo.id;
    let avatarId = userInfo.avatar;

    let avatar = (await (await getRequest(`https://cdn.discordapp.com/avatars/${userId}/${avatarId}.png`, {}, false)).blob())
    console.log(avatar)
    return avatar;
}