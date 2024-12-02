# Submitresource
A super simple web app for submitting resources (links) to a discord channel. 
The links are posted with a webhook and imitate the user (same profile picture
and username).

## Usage
Before using, all fields in `config.json` must be set to an appropriate value.
These should be corresponding to the same discord developer application for this
application to work.

Then, the dependencies must be installed with `pnpm i` (or `npm i`)

Afterwards, the application can be started with

```sh
pnpm run dev
```

as this project was made using pnpm. NPM should also work.

The webserver should then be available on http://localhost:53134.


