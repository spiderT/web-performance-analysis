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