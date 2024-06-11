// Import required modules
const express = require('express');
const cors = require('cors');
const os = require('os');
const fs = require('fs');
const { Mutex } = require('async-mutex');
const csv = require('csv-parser');
const path = require('path');
const engLock = new Mutex();
const chnLock = new Mutex();

const networkInterfaces = os.networkInterfaces();

// Create an instance of Express application
const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.static('public'));
app.use(cors());

const chns = [];
const engs = [];

function getSingaporeTime(){
    const now = new Date();

    // Calculate the timezone offset for +0800 (CST)
    const offsetHours = 0; // Offset in hours
    const offsetMinutes = 0; // Offset in minutes

    // Adjust the date object to reflect the desired timezone
    now.setHours(now.getHours() + offsetHours);
    now.setMinutes(now.getMinutes() + offsetMinutes);

    // Get the current time in the +0800 timezone
    const timeInCST = now.toLocaleString('en-US', { timeZoneName: 'short', timeZone: 'Asia/Singapore' });

    // console.log(timeInCST);
    return timeInCST;
}

app.get('/getQourum', (req, res) => {
  
  const currentTime = getSingaporeTime();

  var chnNum = 0;
  chns.forEach((people, index)=>{
      if( people.attendance == 1 ){
        chnNum = chnNum+1;
      }
  });
  var engNum = 0;
  engs.forEach((people, index)=>{
    if( people.attendance == 1 ){
      engNum = engNum+1;
    }
  });

  var totalNum = 0;
  if( engs && chns && engs.length > 0 && chns.length > 0 ){
    totalNum = engs.length + chns.length
  }

  res.json({chnNum: chnNum, engNum:engNum, totalNum:totalNum, currentTime: currentTime});
});

app.get('/quorum', (req, res) => {
  if( !chns || chns.length <= 0 ){
    const fileContent = fs.readFileSync('config/ACM2024-ChCong.csv', 'utf8');
    fileContent
      .trim()
      .split('\n')
      .forEach(line => {
        if( line && line.length > 0 ){
          const row = {};
          const values = line.split(',');
          row.no = values[0];
          row.chineseName = values[1];
          row.englishName = values[2];
          row.attendance = 0;
          if( values[3] && values[3].length > 0 ){
            row.attendance = values[3];
          }
          chns.push(row);
        }
      });
  }
  if( !engs || engs.length <= 0 ){
    const fileContent = fs.readFileSync('config/ACM2024-EngCong.csv', 'utf8');
    fileContent
      .trim()
      .split('\n')
      .forEach(line => {
        if( line && line.length > 0 ){
          const row = {};
          const values = line.split(',');
          row.no = values[0];
          row.nric = values[3];
          row.birthday = values[4];
          row.attendance = 0;
          if( values[5] && values[5].length > 0 ){
            row.attendance = values[5];
          }
          engs.push(row);
        }
      });
  }

  const currentTime = getSingaporeTime();

  var chnNum = 0;
  chns.forEach((people, index)=>{
      if( people.attendance == 1 ){
        chnNum = chnNum+1;
      }
  });
  var engNum = 0;
  engs.forEach((people, index)=>{
    if( people.attendance == 1 ){
      engNum = engNum+1;
    }
  });

  var totalNum = 0;
  if( engs && chns && engs.length > 0 && chns.length > 0 ){
    totalNum = engs.length + chns.length
  }

  console.info("Eng Attendance : " );
  engs.forEach((people, index) => {
    console.info( `${people.no},${people.nric},${people.birthday},${people.attendance}` );
  });
  console.info("Chn Attendance : " );
  chns.forEach((people, index) => {
    console.info( `${people.no},${people.chineseName},${people.englishName},${people.attendance}` );
  });

  res.render('quorum', {chnNum: chnNum, engNum:engNum, totalNum:totalNum, currentTime: currentTime});
});

// Define a route handler for the root URL
app.get('/eng', (req, res) => {
  if( !engs || engs.length <= 0 ){
    const fileContent = fs.readFileSync('config/ACM2024-EngCong.csv', 'utf8');
    fileContent
      .trim()
      .split('\n')
      .forEach(line => {
        if( line && line.length > 0 ){
          const row = {};
          const values = line.split(',');
          row.no = values[0];
          row.nric = values[3];
          row.birthday = values[4];
          row.attendance = 0;
          if( values[5] && values[5].length > 0 ){
            row.attendance = values[5];
          }
          engs.push(row);
        }
      });
  }

    res.render('eng', {});
});

app.post('/eng', (req, res) => {
  if( !engs || engs.length <= 0 ){
    const fileContent = fs.readFileSync('config/ACM2024-EngCong.csv', 'utf8');
    fileContent
      .trim()
      .split('\n')
      .forEach(line => {
        if( line && line.length > 0 ){
          const row = {};
          const values = line.split(',');
          row.no = values[0];
          row.nric = values[3];
          row.birthday = values[4];
          row.attendance = 0;
          if( values[5] && values[5].length > 0 ){
            row.attendance = values[5];
          }
          engs.push(row);
        }
      });
  }

  const birthday = req.body.birthday;
  const nric = req.body.nric;

  const filePath = 'config/ACM2024-EngCong.csv';

  var isFound = false;
  engs.forEach((people, index) => {
    if( people.nric 
        && people.nric.length > 0 
        && people.nric.startsWith(nric) 
        && people.birthday
        && people.birthday.length > 0 
        && birthday === people.birthday.replace(/^\s+|\s+$/g, '') ){
        isFound = true;
        console.info( `eng found matched: ${nric}, ${birthday}` );
        people.attendance = req.body.isAttended;
        engs[index] = people

        fs.readFile(filePath, 'utf8', async (err, data) => {
          if (err) {
              res.status(500).json({'result': 'Sorry, can you register your attendance again? You may approach the counter staff for assistance.'});
          }
  
          const release = await acquireEngLockWithRetry(5, 1000);
          try{
              // Split the content into lines
              const lines = data.split('\n');
              const newLines = lines.map((line) => {
                                  if( line.indexOf(birthday) > -1 && line.indexOf(nric) > -1 ){
                                    var result = line.replace(/[\r\n]+/g, '');
                                    if( line.endsWith(",1") ){
                                      result = line.slice(0, -2);
                                    }
                                    result += `,${req.body.isAttended}`;
                                    return result;
                                  }
                                  return line;
                              });
      
              if (newLines && newLines.length > 0) {
                  const updatedContent = newLines.join('\n');
                  fs.writeFileSync(filePath, updatedContent, 'utf8');
              }
          }finally{
              release();
          }
      });
    }
  });

  if( isFound ){
    res.status(200).json({'result': 'Thank you. Your attendance is registered.'});
  }else{
    res.status(500).json({'result': 'Sorry, can you register your attendance again? You may approach the counter staff for assistance.'});
  }
});

async function acquireEngLockWithRetry(maxAttempts, delay) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
          const release = await engLock.acquire();
          return release; // If acquire succeeds, return the release function
      } catch (error) {
          console.error(`Attempt ${attempt} failed to acquire lock:`, error);
          // If acquire fails, log the error and retry after a delay
          await new Promise(resolve => setTimeout(resolve, delay));
      }
  }
  // If maxAttempts reached without acquiring the lock, return null
  return null;
}

async function acquireChnLockWithRetry(maxAttempts, delay) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
          const release = await chnLock.acquire();
          return release; // If acquire succeeds, return the release function
      } catch (error) {
          console.error(`Attempt ${attempt} failed to acquire lock:`, error);
          // If acquire fails, log the error and retry after a delay
          await new Promise(resolve => setTimeout(resolve, delay));
      }
  }
  // If maxAttempts reached without acquiring the lock, return null
  return null;
}

app.get('/regNew', (req, res) => {
  if( !engs || engs.length <= 0 ){
    const fileContent = fs.readFileSync('config/ACM2024-EngCong.csv', 'utf8');
    fileContent
      .trim()
      .split('\n')
      .forEach(line => {
        if( line && line.length > 0 ){
          const row = {};
          const values = line.split(',');
          row.no = values[0];
          row.nric = values[3];
          row.birthday = values[4];
          row.attendance = 0;
          if( values[5] && values[5].length > 0 ){
            row.attendance = values[5];
          }
          engs.push(row);
        }
      });
  }

    res.render('newReg', {});
});

app.post('/regNew', (req, res) => {
  if( !engs || engs.length <= 0 ){
    const fileContent = fs.readFileSync('config/ACM2024-EngCong.csv', 'utf8');
    fileContent
      .trim()
      .split('\n')
      .forEach(line => {
        if( line && line.length > 0 ){
          const row = {};
          const values = line.split(',');
          row.no = values[0];
          row.nric = values[3];
          row.birthday = values[4];
          row.attendance = 0;
          if( values[5] && values[5].length > 0 ){
            row.attendance = values[5];
          }
          engs.push(row);
        }
      });
  }

  const birthday = req.body.birthday;
  const nric = req.body.nric;

  if( !birthday || birthday.length <= 0 || !nric || nric.length <= 0 ){
      res.status(500).json({'result': 'birthday and nric are all required'});
      return;
  } 

  const nextNo = parseInt(engs[engs.length-1].no) + 1; 
  const newLine = {'no': nextNo, 'nric': nric, 'birthday': birthday, 'attendance': 1}       
  engs[engs.length] = newLine;        

  const filePath = 'config/ACM2024-EngCong.csv';
  appendToFile(filePath, newLine);

  res.status(200).json({'result': 'New attendance is registered.'});
});

async function appendToFile(filePath, newJson){
    const release = await acquireEngLockWithRetry(5, 1000);
    const newLine = `${newJson.no},'','',${newJson.nric},${newJson.birthday},1` + '\n';
    try{
      fs.appendFile(filePath, newLine, (err) => {
        if (err) {
          console.error('Error appending lines to the text file:', err);
        } else {
          console.log('New lines added to the text file successfully.');
          console.info( `eng new registration: ${newJson.nric}, ${newJson.birthday}` );
        }
      });
    }finally{
        release();
    }
}


app.get('/chn', (req, res) => {

  try {
    if( !chns || chns.length <= 0 ){
      const fileContent = fs.readFileSync('config/ACM2024-ChCong.csv', 'utf8');
      fileContent
        .trim()
        .split('\n')
        .forEach(line => {
          if( line && line.length > 0 ){
            const row = {};
            const values = line.split(',');
            row.no = values[0];
            row.chineseName = values[1];
            row.englishName = values[2];
            row.attendance = 0;
            if( values[3] && values[3].length > 0 ){
              row.attendance = values[3];
            }
            chns.push(row);
          }
        });
    }
  
    res.render('chn', { list: chns });
  } catch (error) {
    console.error('Error reading file:', error);
  }
});

// Define a route handler for a dynamic route
app.post('/chn/:id', (req, res) => {
  if( !chns || chns.length <= 0 ){
    const fileContent = fs.readFileSync('config/ACM2024-ChCong.csv', 'utf8');
    fileContent
      .trim()
      .split('\n')
      .forEach(line => {
        if( line && line.length > 0 ){
          const row = {};
          const values = line.split(',');
          row.no = values[0];
          row.chineseName = values[1];
          row.englishName = values[2];
          row.attendance = 0;
          if( values[3] && values[3].length > 0 ){
            row.attendance = values[3];
          }
          chns.push(row);
        }
      });
  }

  const id = req.params.id.toString();
  var isAttended = 0;
  if( req.body.isAttended ){
      isAttended = 1;
  }
  const name = req.body.englishName;

  const filePath = 'config/ACM2024-ChCong.csv';

  chns.forEach((people, index) => {
    if( id === people.no && name === people.englishName ){
        console.info( `chn found matched: ${name}` );
        people.attendance = isAttended;
        chns[index] = people

        fs.readFile(filePath, 'utf8', async (err, data) => {
          if (err) {
              res.json({'result': err});
          }
  
          const release = await chnLock.acquire();
          try{
            const lines = data.split('\n');
            const newLines = lines.map((line) => {
                                if( line.startsWith(`${id},`) ){
                                  var result = line.replace(/[\r\n]+/g, '');
                                  var result = line.slice(0, -1);
                                  result += isAttended;
                                  return result;
                                }
                                return line;
                            });
    
            if (newLines && newLines.length > 0) {
                const updatedContent = newLines.join('\n');
                fs.writeFileSync(filePath, updatedContent, 'utf8');
            }
          }finally{
              release();
          }
      });

    }
  });

  res.json({'result': 'ok'});

});

// Start the server
const port = process.env.PORT || 3000; // Use the port provided by environment variable or default to 3000
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});