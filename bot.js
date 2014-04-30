/*jslint node: true, indent: 2 */
'use strict';

//npm install twit
var Twitter = require('twit'),
  fs = require('fs');

/*
  Sign in to dev.twitter.com/apps
  create an application
  Permissions tab -> Set required access level ( Default is Read Only )
  API Keys tab -> Regenerate API Keys if needed
  Generate Access token
  Consumer key = API key

  config.json
    {
      consumer_key: '...',
      consumer_secret: '...',
      access_token: '...',
      access_token_secret: '...'
    }
*/

var config = require('./config.json'),
  twit = new Twitter(config);

function tweet() {

  /*
    Key file format

    keys.json:
      {
        "path": "./keys.json",
        "total": 1072,
        "keys": [
          "SKYPE-H7N36-XCUYH-7T7KD-9K8CA",
          ...
          "SKYPE-VUF94-CEM79-JHXKT-FB3N4"
        ]
      }

    used.json:
      {
        "path": "./used.json",
        "total": 497,
        "keys": [
          "SKYPE-H7N36-XCUYH-7T7KD-9K8CA",
          ...
          "SKYPE-VUF94-CEM79-JHXKT-FB3N4"
        ],
        "errorKeys": []
      }

    I could probably have just managed these in a single file to be honest.

  */

  //load key files
  console.log('load key files');
  var unused, used;

  // var unused = require('./keys.json'),
  //   used = require('./used.json');

  /*
    I was using require previously, and that still works fine as long as you
    don't need to change the file and have the app reflect those changes on
    the fly.
    require() caches the file, so changes after the fact are not reflected.
    In this, I wanted to be able to remove a key from the keys json file,
    save the file, and have the app no longer see that key the next time it
    went to tweet.
    Do keep in mind that using readFileSync inside the program "body" is a
    /terrible/ idea in most cases, the only reason I can get away with using it
    here is because this app is just a single short lived function running on
    an interval. If I needed to respond to requests, ie: a webserver, then
    blocking calls are completely unacceptable, as they prevent the server from
    responding for the duration of function execution.
    I could ( and should ) be using readFile with callbacks.
  */

  try {
    unused = JSON.parse(fs.readFileSync('./keys.json', 'utf8'));
    console.log('read ' + './keys.json');
  } catch (err) {
    if (err) return console.log(err);
    // These should be thrown, not console logged
  }

  try {
    used = JSON.parse(fs.readFileSync('./used.json', 'utf8'));
    console.log('read ' + './used.json');
  } catch (err) {
    if (err) return console.log(err);
  }

  console.log('start tweet');

  //get a new key, removing one from the unused stack
  var newKey = unused.keys.shift();

  if (typeof newKey === 'undefined') {
    //no more keys in unused.keys, so we're empty. Finale tweet, then quit.
    twit.post('statuses/update', {
      status: 'That\'s a wrap! Enjoy your premium ;p \n\n#IncendiaryMedia #Free #Giveaway #FriendlyFire #SkypeGiveaway\n\n#rip'
    }, function(err, reply) {
      console.log('\nTweet: ' + (reply ? reply.text : reply));
      process.exit();
    });
  }

  //post tweet, format:
  // #1 SKYPE-YDAXJ-BP9G9-YVB7E-8R6G9
  // Redeem at: http://skype.com/go/voucher
  // #IncendiaryMedia #Free #Giveaway #FriendlyFire #SkypeGiveaway
  twit.post('statuses/update', {
    status: '#' + (used.total + 1) + ' ' + newKey + ' \nRedeem at: http://skype.com/go/voucher \n#IncendiaryMedia #Free #Giveaway #FriendlyFire #SkypeGiveaway'
  }, function(err, reply) {
    if (err) {
      //error, push to error key stack
      used.errorKeys.push(newKey);
      //write the keyfiles
      writeFiles(unused, used);
      //handle the error
      return handleError(err);
    }

    //no error, so push the key onto the stack
    used.keys.push(newKey);
    //and increment used total
    used.total += 1;

    //write the json files
    writeFiles(unused, used);

    //log the tweet to console
    console.log('\nTweet: ' + (reply ? reply.text : reply));
  });
}

function writeFiles(file1, file2) {

  /*
    this is bad code, and I can't remember why I decided to make this Sync code
    it's like an archaeological survey where nobody can figure out why
    something is scratched off of an otherwise fine wall carving.

    except this is only a few days old and I still cant figure out why I did it

    These are also awful and specific to these files as they use a file path
    specified in the file itself.
    This was so I could rename the files later if I wanted to without changing
    the bot's code.
    Yes my friends, this was done out of /sheer laziness/.

    No I never ended up renaming the files.
  */

  try {
    fs.writeFileSync(file1.path, JSON.stringify(file1, null, 2));

    /*
      Did /you/ know stringify can make human-readable ( formatted ) objects?
      arg 2 ( null ) is where the replacer function would go if I wanted one
      and the final arg is the # of whitespace to use ( or whitespace chars? ).
    */

    console.log('wrote ' + file1.path);
  } catch (err) {
    if (err) return console.log(err);
    //Again, these should be thrown, not console logged, especially for writes.
    //Transactional pls.
  }

  try {
    fs.writeFileSync(file2.path, JSON.stringify(file2, null, 2));
    console.log('wrote ' + file2.path);
  } catch (err) {
    if (err) return console.log(err);
  }

  // fs.writeFile(file2.path, JSON.stringify(file2, null, 2), function(err) {
  //   if (err) return console.log(err);
  //   console.log('wrote ' + file2.path);
  // });
}

function handleError(err) {
  // pro error "handling"
  console.error('response status:', err.statusCode);
  console.error('data:', err.data);
}

console.log('start timer');
setInterval(function() {
  tweet();
  // "my app is only 3 lines of code look at how succinct it is #buzzwords"
}, 540000); // 9 minutes
