function checkIfAuthorized() {
    fetch('/api/oauth2/hasauthorized')
        .then(async res => {
            document.getElementById('auth-span').innerHTML = res.status == 400 ?
                `Not authenticated. <a href="${await ((await fetch('/api/oauth2/authurl')).text())}" class="re-auth">Reauthenticate?</a>` : ((res.status == 200 ? '<span class="auth-text">Authenticated.</span>' : '<span class="auth-text">Authenticated. (No access_token)</span>') + ' <a class="recheck" href="javascript:void();" onclick="checkIfAuthorized(); return false;" style="display: inline;">Recheck?</a>');
        })
        .catch(console.error);
}

checkIfAuthorized()

function joinServer() {
    let id = document.getElementById('guildId').value;
    if (id.length == 0) return;
    let href = `/api/oauth2/joinserver?guild-id=${id}`;

    fetch(href)
        .then(res => res.json())
        .then(json => document.getElementById('joinserver-res').innerText = JSON.stringify(json).replace(/,/g, ',\n').replace(/:/g, ': '));
}

function getUserInfo() {
    fetch("/api/oauth2/user")
        .then(res => res.json())
        .then(json => document.getElementById('user-info').innerText = JSON.stringify(json).replace(/,/g, ',\n').replace(/:/g, ': '));
}