var express = require('express');
var RSS = require('rss');
var FeedParser = require('feedparser');
var cheerio = require('cheerio');
var Q = require('q');
var http = require('http');
var app = express();

var rivvaFeedUrl = "http://feeds.feedburner.com/rivva";

var logStatus = false;

app.set('port', (process.env.PORT || 5000))
app.use(express.static(__dirname + '/public'))

app.get('/', function(request, response) {
  var feedItems = [];
  http.get(rivvaFeedUrl, function(res) {
    res.pipe(new FeedParser({}))
      .on('error', function(error){
          response.status(500).send("Oh snap, an error occured.");
      })
      .on('meta', function(meta){
          feedMeta = meta;
          if(logStatus) console.log("got meta...");
      })
      .on('readable', function(){
        var stream = this, item;
        while (item = stream.read()){
          if(logStatus) console.log("adding feed item..." + feedItems.length);
          feedItems.push(item);
        }
      })
      .on('end', function(){
        if(logStatus) console.log("got all feed items...");
        var promises = [];
        for(var i = 0; i < feedItems.length; i++) {
          var item = feedItems[i];
          promises.push(getPostTitle(i, item.link));
        }
        if(logStatus) console.log("waiting for all direct links... (" + promises.length + ")");
        Q.all(promises).then(function(result) {
          if(logStatus) console.log("building RSS now...");
          var feed = new RSS(feedMeta);

          if(logStatus) console.log("going through all items...");

          for(var i = 0; i < result.length; i++) {
            var index = result[i].index;
            var link = result[i].link;
            feedItems[index].url = link;
          }

          for(var i = 0; i < feedItems.length; i++) {
            feed.item(feedItems[i]);
          }

          response.setHeader('Content-Type', 'text/xml');
          response.status(200).send(feed.xml());
        });
      });
    });
});

app.listen(app.get('port'), function() {
  if(logStatus) console.log("Node app is running at localhost:" + app.get('port'))
})

var getPostTitle = function(index, url) {
  var data = "", defer = Q.defer();
  http.get(url, function (res) {
    var content_length = parseInt(res.headers['content-length'], 10);
    var total_downloaded = 0;
    if (res.statusCode !== 200) {
      defer.reject("HTTP Error " + res.statusCode + " for " + url);
      return;
    }
    res.on("error", defer.reject);
    res.on("data", function (chunk) {
      data += chunk;
      total_downloaded += chunk.length;
      var percentage = Math.floor((total_downloaded / content_length) * 100);
      defer.notify(percentage);
    });
    res.on("end", function () {
      if(logStatus) console.log("getting direct link "+index+" of page " + url);
      $ = cheerio.load(data);
      var directLink = $("div>article>header>h1>a").attr("href");
      if(logStatus) console.log("got direct link "+index+" of page " + url);
      defer.resolve({
        index: index,
        link: directLink
      });
    });
  });
  return defer.promise;
}