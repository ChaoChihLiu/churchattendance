const fs = require('fs');
const axios = require('axios');

// Function to read a file asynchronously
function readFileAsync(filePath) {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

// Function to send HTTP requests
async function sendRequests(row) {
    console.info(row)
    const postData = {
        birthday: row.birthday,
        nric: row.nric,
        isAttended: 1
    };
    
    // Define the URL where you want to send the POST request
    const url = 'http://13.229.52.102:3000/eng';
    
    // Define the headers
    const headers = {
        'Content-Type': 'application/json'
    };
    
    // Send the POST request with headers
    axios.post(url, postData, { headers })
        .then(response => {
            console.log('Response:', response.data);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

// Example usage
async function main() {
    try {
        const fileContent = await readFileAsync('config/ACM2025-EngCong.csv');
        fileContent
            .trim()
            .split('\n')
            .forEach(line => {
                if( line && line.length > 0 ){
                    const row = {};
                    const values = line.split(',');
                    row.no = values[0];
                    row.nric = values[3];
                    row.birthday = values[4].trim();
                    row.attendance = 0;
                    if( values[5] && values[5].length > 0 ){
                        row.attendance = values[5];
                    }
                    sendRequests(row);
                }
            });
        // const urls = fileContent.split('\n').map(url => url.trim());
        // sendRequests(urls);
    } catch (error) {
        console.error('Error reading file:', error);
    }
}

main();
