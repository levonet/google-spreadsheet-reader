'use strict';

const fs = require('fs');
const os = require('os');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const program = require('commander');
const version = require('./package').version;

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-gssr.json
const GOOGLE_AUTH_SCOPE = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-gssr.json';

module.exports.run = (argv) => {
    program
        .version(version)
        .usage('<options> [outputFile]')
        .option('-c, --client-secrets-file <file>', 'OAuth client secrets file or Service account key file'
            + '\n\t\t See this wizard: https://developers.google.com/sheets/api/quickstart/nodejs#step_1_turn_on_the_api_name'
            + '\n\t\t',
            'client_secret.json')
        .option('-k, --spreadsheet-id <id>', 'spreadsheet Id from URL')
        .option('-r, --spreadsheet-range <value>', 'spreadsheet range. For example: `Sheet1!C2:E`')
        .option('-s, --output-separator <value>', 'output separator', '\t')
        .arguments('[outputFile]')
        .action((outputFile) => {
            if (typeof outputFile !== 'undefined') {
                var access = fs.createWriteStream(outputFile, {flags: 'w'});
                process.stdout.write = access.write.bind(access);
            }
        })
        .parse(argv);

    // Load client secrets from a local file.
    fs.readFile(program.clientSecretsFile, (err, content) => {
        if (err) {
            console.error('Error loading client secret file:', err);
            process.exit(err.errno);
        }
        // Authorize a client with the loaded credentials, then call the Google Sheets API.
        authorize(JSON.parse(content), listData);
    });

    /**
     * Authorizing and execute the given callback function.
     *
     * @param {Object} credentials The authorization client secret or Service account key.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorize(credentials, callback) {
        if (credentials.hasOwnProperty('type') && credentials.type === 'service_account') {
            authorizeJWT(credentials, callback);
        } else {
            authorizeOAuth2(credentials, callback);
        }
    }

    /**
     * Create an OAuth2 client using JWT (Service Tokens), and then execute the
     * given callback function.
     *
     * @param {Object} credentials The authorization Service account key.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorizeJWT(credentials, callback) {
        const auth = new googleAuth();
        const client = new auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            GOOGLE_AUTH_SCOPE,
            null);
        client.authorize((err, token) => {
            if (err) {
                console.error(err)
                return;
            }
            callback(client);
        });
    }

    /**
     * Create an OAuth2 client with the given credentials, and then execute the
     * given callback function.
     *
     * @param {Object} credentials The authorization client credentials.
     * @param {function} callback The callback to call with the authorized client.
     */
    function authorizeOAuth2(credentials, callback) {
        var clientSecret = credentials.installed.client_secret;
        var clientId = credentials.installed.client_id;
        var redirectUrl = credentials.installed.redirect_uris[0];
        var auth = new googleAuth();
        var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, (err, token) => {
            if (err) {
                getNewToken(oauth2Client, callback);
            } else {
                oauth2Client.credentials = JSON.parse(token);
                callback(oauth2Client);
            }
        });
    }

    /**
     * Get and store new token after prompting for user authorization, and then
     * execute the given callback with the authorized OAuth2 client.
     *
     * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
     * @param {getEventsCallback} callback The callback to call with the authorized
     *     client.
     */
    function getNewToken(oauth2Client, callback) {
        var authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: GOOGLE_AUTH_SCOPE
        });

        console.log(`Authorize this app by visiting this url: ${authUrl}`);

        var rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        rl.question('Enter the code from that page here: ', (code) => {
            rl.close();
            oauth2Client.getToken(code, (err, token) => {
                if (err) {
                    console.error('Error while trying to retrieve access token', err);
                    process.exit(err.code);
                }
                oauth2Client.credentials = token;
                storeToken(token);
                callback(oauth2Client);
            });
        });
    }

    /**
     * Store token to disk be used in later program executions.
     *
     * @param {Object} token The token to store to disk.
     */
    function storeToken(token) {
        try {
           fs.mkdirSync(TOKEN_DIR);
        } catch (err) {
            if (err.code != 'EEXIST') {
                throw err;
            }
        }
        fs.writeFile(TOKEN_PATH, JSON.stringify(token));
        console.log(`Token stored to ${TOKEN_PATH}`);
    }

    /**
     * List range from Google Spreadsheets.
     *
     * @param {Object} auth OAuth2 authorized client.
     */
    function listData(auth) {
        var sheets = google.sheets('v4');
        sheets.spreadsheets.values.get({
            auth: auth,
            spreadsheetId: program.spreadsheetId,
            range: program.spreadsheetRange,
        }, (err, response) => {
            if (err) {
                console.error('The API returned an error:', err);
                process.exit(err.code);
            }

            response.values.forEach((cels) => {
                let row = cels.join(program.outputSeparator);
                process.stdout.write(row + os.EOL);
            });
        });
    }
};
