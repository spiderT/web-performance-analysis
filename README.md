# web-performance-analysis

参考资料：https://nicj.net/navigationtiming-in-practice/ https://nicj.net/resourcetiming-in-practice/

## 1. 介绍

ResourceTiming 是 W3C Web Performance working group  的 一个规范，目标是为了得到一个准确性能指标，对所有的资源下载页面加载期间的经历,比如图像、CSS和JavaScript。

ResourceTiming基于NavigationTiming，提供了更多的测量标准，例如，DNS, TCP, request, response 阶段, 和 “loaded” timestamp.

ResourceTiming灵感来自资源加载瀑布图，瀑布图展示了所有网络资源获取的时间表，可以快速的看到一些问题。下图是一个 Chrome Developer Tools的例子：

![瀑布图](images/waterfall.jpg)

可以根据下图分成几个时间段

![timing](images/timing.jpg)

- name is the fully-resolved URL of the attribute (relative URLs in your HTML will be expanded to include the full protocol, domain name and path)
- entryType will always be "resource" for ResourceTiming entries
- startTime is the time the resource started being fetched
- duration is the overall time required to fetch the resource
- initiatorType is the localName of the element that initiated the fetch of the resource (see details below)
- nextHopProtocol: ALPN Protocol ID such as http/0.9 http/1.0 http/1.1 h2 hq spdy/3 (ResourceTiming Level 2)
- workerStart is the time immediately before the active Service Worker received the fetch event, if a ServiceWorker is installed
- redirectStart and redirectEnd encompass the time it took to fetch any previous resources that redirected to the final one listed. If either timestamp is 0, there were no redirects, or one of the redirects wasn’t from the same origin as this resource.
- fetchStart is the time this specific resource started being fetched, not including redirects
- domainLookupStart and domainLookupEnd are the timestamps for DNS lookups
- connectStart and connectEnd are timestamps for the TCP connection
- secureConnectionStart is the start timestamp of the SSL handshake, if any. If the connection was over HTTP, or if the browser doesn’t support this timestamp (eg. Internet Explorer), it will be 0.
- requestStart is the timestamp that the browser started to request the resource from the remote server
- responseStart and responseEnd are the timestamps for the start of the response and when it finished downloading
- transferSize: Bytes transferred for the HTTP response header and content body (ResourceTiming Level 2)
- decodedBodySize: Size of the body after removing any applied content-codings (ResourceTiming Level 2)
- encodedBodySize: Size of the body after prior to removing any applied content-codings (ResourceTiming Level 2)


### Initiator Types

- img
- link
- script
- css: url(), @import
- xmlhttprequest
- iframe (known as subdocument in some versions of IE)
- body
- input
- frame
- object
- image
- beacon
- fetch
- video
- audio
- source
- track
- embed
- eventsource
- navigation
- other
- use

以下是常用HTML elements and JavaScript APIs的initiatorType对照关系：

```js
<img src="...">: img
<img srcset="...">: img
<link rel="stylesheet" href="...">: link
<link rel="prefetch" href="...">: link
<link rel="preload" href="...">: link
<link rel="prerender" href="...">: link
<link rel="manfiest" href="...">: link
<script src="...">: script
CSS @font-face { src: url(...) }: css
CSS background: url(...): css
CSS @import url(...): css
CSS cursor: url(...): css
CSS list-style-image: url(...): css
<body background=''>: body
<input src=''>: input
XMLHttpRequest.open(...): xmlhttprequest
<iframe src="...">: iframe
<frame src="...">: frame
<object>: object
<svg><image xlink:href="...">: image
<svg><use>: use
navigator.sendBeacon(...): beacon
fetch(...): fetch
<video src="...">: video
<video poster="...">: video
<video><source src="..."></video>: source
<audio src="...">: audio
<audio><source src="..."></audio>: source
<picture><source srcset="..."></picture>: source
<picture><img src="..."></picture>: img
<picture><img srcsec="..."></picture>: img
<track src="...">: track
<embed src="...">: embed
favicon.ico: link
EventSource: eventsource
```

### Cached Resources

以下这个方法可以判断，是否命中了缓存（This algorithm isn’t perfect, but probably covers 99% of cases）：

```js
function isCacheHit() {
  // if we transferred bytes, it must not be a cache hit
  // (will return false for 304 Not Modified)
  if (transferSize > 0) return false;

  // if the body size is non-zero, it must mean this is a
  // ResourceTiming2 browser, this was same-origin or TAO,
  // and transferSize was 0, so it was in the cache
  if (decodedBodySize > 0) return true;

  // fall back to duration checking (non-RT2 or cross-origin)
  return duration < 30;
}
```

### 304 Not Modified

```js
function is304() {
  if (encodedBodySize > 0 &&
      tranferSize > 0 &&
      tranferSize < encodedBodySize) {
    return true;
  }

  // unknown
  return null;
}
```

### Blocking Time

```js
var blockingTime = 0;
if (res.connectEnd && res.connectEnd === res.fetchStart) {
    blockingTime = res.requestStart - res.connectEnd;
} else if (res.domainLookupStart) {
    blockingTime = res.domainLookupStart - res.fetchStart;
}
```

