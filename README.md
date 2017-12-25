# Google Spreadsheets Reader

`gssr` — tools for output some parts of Google Spreadsheets in console or file.

```sh
gssr --help

  Usage: gssr <options> [outputFile]


  Options:

    -V, --version                     output the version number
    -c, --client-secrets-file <file>  OAuth client secrets file
             See this wizard: https://developers.google.com/sheets/api/quickstart/nodejs#step_1_turn_on_the_api_name
             (default: client_secret.json)
    -k, --spreadsheet-id <id>         spreadsheet Id from URL
    -r, --spreadsheet-range <value>   spreadsheet range. For example: `Sheet1!C2:E`
    -s, --output-separator <value>    output separator (default: `\t`)
    -h, --help                        output usage information
```
