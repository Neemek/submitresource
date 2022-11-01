module.exports = {
    apps: [
        {
            name: "web & api",
            script: "./build/src/index.js"
        }
    ],
    deploy: {
        production: {
            "user": "ubuntu",
            "host": ["DEPLOYMENT_IP_HERE"],
            "ref": "origin/master",
            "repo": "git@github.com:Username/repository.git",
            "path": "/var/www/my-repository",
            "post-deploy": "npm install"
        }

    }
}