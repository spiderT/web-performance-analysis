# web-performance-analysis

- [web-performance-analysis](#web-performance-analysis)
  - [1. 介绍](#1-介绍)
    - [Initiator Types](#initiator-types)
    - [Cached Resources](#cached-resources)
    - [304 Not Modified](#304-not-modified)
    - [Blocking Time](#blocking-time)
  - [2. Performance api](#2-performance-api)
    - [2.1 分析](#21-分析)
    - [2.2 异常上报](#22-异常上报)
  - [3. http2 性能优化](#3-http2-性能优化)
  - [4. chrome-performance页面性能分析](#4-chrome-performance页面性能分析)
    - [4.1. 模拟移动设备的CPU](#41-模拟移动设备的cpu)
    - [4.2. 分析报告](#42-分析报告)
    - [4.3. 界面介绍](#43-界面介绍)

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

## 2. Performance api

1. PerformanceObserver API  
用于检测性能的事件，这个 API 利用了观察者模式。  
获取资源信息  

![per](images/per1.jpg)

监测 TTI

![per](images/per2.jpg)

监测 长任务

![per](images/per3.jpg)

2. Navigation Timing API

https://www.w3.org/TR/navigation-timing-2/  
performance.getEntriesByType("navigation");  

![per](images/per4.jpg)

![per](images/per5.jpg)

不同阶段之间是连续的吗? —— 不连续  
每个阶段都一定会发生吗？—— 不一定  

重定向次数：performance.navigation.redirectCount  
重定向耗时: redirectEnd - redirectStart  
DNS 解析耗时: domainLookupEnd - domainLookupStart  
TCP 连接耗时: connectEnd - connectStart  
SSL 安全连接耗时: connectEnd - secureConnectionStart  
网络请求耗时 (TTFB): responseStart - requestStart  
数据传输耗时: responseEnd - responseStart  
DOM 解析耗时: domInteractive - responseEnd  
资源加载耗时: loadEventStart - domContentLoadedEventEnd  
首包时间: responseStart - domainLookupStart  
白屏时间: responseEnd - fetchStart  
首次可交互时间: domInteractive - fetchStart  
DOM Ready 时间: domContentLoadEventEnd - fetchStart  
页面完全加载时间: loadEventStart - fetchStart  
http 头部大小： transferSize - encodedBodySize  

3. Resource Timing API  

https://w3c.github.io/resource-timing/  
performance.getEntriesByType("resource");  

![per](images/per6.jpg)
![per](images/per7.jpg)

```js

// 某类资源的加载时间，可测量图片、js、css、XHR
resourceListEntries.forEach(resource => {
    if (resource.initiatorType == 'img') {
    console.info(`Time taken to load ${resource.name}: `, resource.responseEnd - resource.startTime);
    }
});
```

4. paint Timing API  

https://w3c.github.io/paint-timing/  
首屏渲染时间、首次有内容渲染时间  

```js
const paintEntries = performance.getEntriesByType("paint");


// This will return an array consisting of two objects:

[
  {
    "name": "first-paint",
    "entryType": "paint",
    "startTime": 17718.514999956824,
    "duration": 0
  },
  {
    "name": "first-contentful-paint",
    "entryType": "paint",
    "startTime": 17718.519999994896,
    "duration": 0
  }
]

// From the entries, we can extract out the metrics:

paintEntries.forEach((paintMetric) => {
  console.info(`${paintMetric.name}: ${paintMetric.startTime}`);
});
```

![per](images/per8.jpg)

5. User Timing API  
https://www.w3.org/TR/user-timing-2/#introduction  
主要是利用 mark 和 measure 方法去打点计算某个阶段的耗时，例如某个函数的耗时等。  

```js
pperformance.mark('starting_calculations')
const multiply = 82 * 21;
performance.mark('ending_calculations')
+ performance.measure("multiply_measure", "starting_calculations", "ending_calculations");

performance.mark('starting_awesome_script')
function awesomeScript() {
  console.log('doing awesome stuff')
}
performance.mark('starting_awesome_script');
+ performance.measure("awesome_script", "starting_awesome_script", "starting_awesome_script");

// To get all our measures, we can use our trusty getEntriesByType:

const measures = performance.getEntriesByType('measure');
    measures.forEach(measureItem => {
      console.log(`${measureItem.name}: ${measureItem.duration}`);
    });
```

6. High Resolution Time API  
https://w3c.github.io/hr-time/#dom-performance-timeorigin  
主要包括 now() 方法和 timeOrigin 属性。  

7. Performance Timeline API  
https://www.w3.org/TR/performance-timeline-2/#introduction  

### 2.1 分析

基于 performance 我们可以测量如下几个方面：  
mark、measure、navigation、resource、paint、frame。  

let p = window.performance.getEntries();  
重定向次数：performance.navigation.redirectCount  
JS 资源数量：p.filter(ele => ele.initiatorType === "script").length  
CSS 资源数量：p.filter(ele => ele.initiatorType === "css").length  
AJAX 请求数量：p.filter(ele => ele.initiatorType === "xmlhttprequest").length  
IMG 资源数量：p.filter(ele => ele.initiatorType === "img").length  
总资源数量: window.performance.getEntriesByType("resource").length  

不重复的耗时时段区分：  
重定向耗时: redirectEnd - redirectStart  
DNS 解析耗时: domainLookupEnd - domainLookupStart  
TCP 连接耗时: connectEnd - connectStart  
SSL 安全连接耗时: connectEnd - secureConnectionStart  
网络请求耗时 (TTFB): responseStart - requestStart  
HTML 下载耗时：responseEnd - responseStart  
DOM 解析耗时: domInteractive - responseEnd  
资源加载耗时: loadEventStart - domContentLoadedEventEnd  

其他组合分析：  
白屏时间: domLoading - fetchStart  
粗略首屏时间: loadEventEnd - fetchStart 或者 domInteractive - fetchStart  
DOM Ready 时间: domContentLoadEventEnd - fetchStart  
页面完全加载时间: loadEventStart - fetchStart  

JS 总加载耗时:  
const p = window.performance.getEntries();  
let cssR = p.filter(ele => ele.initiatorType === "script");  
Math.max(...cssR.map((ele) => ele.responseEnd)) - Math.min(...cssR.map((ele) => ele.startTime));  

CSS 总加载耗时:

```js
const p = window.performance.getEntries();
let cssR = p.filter(ele => ele.initiatorType === "css");
Math.max(...cssR.map((ele) => ele.responseEnd)) - Math.min(...cssR.map((ele) => ele.startTime));
```

### 2.2 异常上报

1）js error  
监听 window.onerror 事件  

2）promise reject 的异常  
监听 unhandledrejection 事件  

```js
window.addEventListener("unhandledrejection", function (event) {
    console.warn("WARNING: Unhandled promise rejection. Shame on you! Reason: "
        + event.reason);
});
```

3）资源加载失败  
window.addEventListener('error')  

4）网络请求失败  
重写 window.XMLHttpRequest 和 window.fetch 捕获请求错误  

5）iframe 异常  
window.frames[0].onerror  

6）window.console.error  

## 3. http2 性能优化

1. 二进制分帧

http1.x诞生的时候是明文协议，其格式由三部分组成：start line（request line或者status line），header，body。要识别这3部分就要做协议解析，http1.x的解析是基于文本。基于文本协议的格式解析存在天然缺陷，文本的表现形式有多样性，要做到健壮性考虑的场景必然很多，二进制则不同，只认0和1的组合。基于这种考虑http2.0的协议解析决定采用二进制格式，实现方便且健壮。

http2.0用binary格式定义了一个一个的frame，和http1.x的格式对比如下图：

![http2](images/http1.jpg)

http2.0的格式定义更接近tcp层的方式，这张二机制的方式十分高效且精简。

length定义了整个frame的开始到结束

type定义frame的类型（一共10种）

flags用bit位定义一些重要的参数

stream id用作流控制

payload就是request的正文了

为什么么能在不改动 HTTP/1.x 的语义、方法、状态码、URI 以及首部字段….. 的情况下, HTTP/2 是如何做到「突破 HTTP1.1 的性能限制，改进传输性能，实现低延迟和高吞吐量」？

关键之一就是在 应用层(HTTP/2)和传输层(TCP or UDP)之间增加一个二进制分帧层。

![http2](images/http2.jpg)

对它们采用二进制格式的编码 ，其中 HTTP1.x 的首部信息会被封装到 HEADER frame，而相应的 Request Body 则封装到 DATA frame 里面。
HTTP/2 通信都在一个连接上完成，这个连接可以承载任意数量的双向数据流。

在过去， HTTP 性能优化的关键并不在于高带宽，而是低延迟。TCP 连接会随着时间进行自我「调谐」，起初会限制连接的最大速度，如果数据成功传输，会随着时间的推移提高传输的速度。这种调谐则被称为 TCP 慢启动。具体复习：《再深谈TCP/IP三步握手&四步挥手原理及衍生问题—长文解剖IP》、《从网卡发送数据再谈TCP/IP协议—网络传输速度计算-网卡构造》

由于这种原因，让原本就具有突发性和短时性的 HTTP 连接变的十分低效。

HTTP/2 通过让所有数据流共用同一个连接，可以更有效地使用 TCP 连接，让高带宽也能真正的服务于 HTTP 的性能提升。
总结：

单连接多资源的方式，减少服务端的链接压力,内存占用更少,连接吞吐量更大

由于 TCP 连接的减少而使网络拥塞状况得以改善，同时慢启动时间的减少,使拥塞和丢包恢复速度更快

![http2](images/http3.jpg)

2. 多路复用 (Multiplexing)||连接共享

多路复用允许同时通过单一的 HTTP/2 连接发起多重的请求-响应消息。  
众所周知 ，在 HTTP/1.1 协议中 「浏览器客户端在同一时间，针对同一域名下的请求有一定数量限制。超过限制数目的请求会被阻塞」。

Clients that use persistent connections SHOULD limit the number of simultaneous connections that they maintain to a given server. A single-user client SHOULD NOT maintain more than 2 connections with any server or proxy. A proxy SHOULD use up to 2*N connections to another server or proxy, where N is the number of simultaneously active users. These guidelines are intended to improve HTTP response times and avoid congestion.

source：RFC-2616-8.1.4 Practical Considerations

比如TCP建立连接时三次握手有1.5个RTT（round-trip time）的延迟，为了避免每次请求的都经历握手带来的延迟，应用层会选择不同策略的http长链接方案。又比如TCP在建立连接的初期有慢启动（slow start）的特性，所以连接的重用总是比新建连接性能要好。

一个request对应一个stream并分配一个id，这样一个连接上可以有多个stream，每个stream的frame可以随机的混杂在一起，接收方可以根据stream id将frame再归属到各自不同的request里面。因而 HTTP/2 能多路复用(Multiplexing) ，允许同时通过单一的 HTTP/2 连接发起多重的请求-响应消息。

![http2](images/http4.jpg)

因此 HTTP/2 可以很容易的去实现多流并行而不用依赖建立多个 TCP 连接，HTTP/2 把 HTTP 协议通信的基本单位缩小为一个一个的帧，这些帧对应着逻辑流中的消息。并行地在同一个 TCP 连接上双向交换消息。

前面还提到过连接共享之后，需要优先级和请求依赖的机制配合才能解决关键请求被阻塞的问题。http2.0里的每个stream都可以设置又优先级（Priority）和依赖（Dependency）。优先级高的stream会被server优先处理和返回给客户端，stream还可以依赖其它的sub streams。优先级和依赖都是可以动态调整的。动态调整在有些场景下很有用，假想用户在用你的app浏览商品的时候，快速的滑动到了商品列表的底部，但前面的请求先发出，如果不把后面的请求优先级设高，用户当前浏览的图片要到最后才能下载完成，显然体验没有设置优先级好。同理依赖在有些场景下也有妙用。

3. 首部压缩（Header Compression）

http1.x的header由于cookie和user agent很容易膨胀，而且每次都要重复发送。

HTTP/1.1并不支持 HTTP 首部压缩，为此 SPDY 和 HTTP/2 应运而生

这里普及一个小知识点。现在大家都知道tcp有slow start的特性，三次握手之后开始发送tcp segment，第一次能发送的没有被ack的segment数量是由initial tcp window大小决定的。这个initial tcp window根据平台的实现会有差异，但一般是2个segment或者是4k的大小（一个segment大概是1500个字节），也就是说当你发送的包大小超过这个值的时候，要等前面的包被ack之后才能发送后续的包，显然这种情况下延迟更高。intial window也并不是越大越好，太大会导致网络节点的阻塞，丢包率就会增加，具体细节可以参考IETF这篇文章。http的header现在膨胀到有可能会超过这个intial window的值了，所以更显得压缩header的重要性。

压缩算法的选择  
SPDY/2使用的是gzip压缩算法，但后来出现的两种攻击方式BREACH和CRIME使得即使走ssl的SPDY也可以被破解内容，最后综合考虑采用的是一种叫HPACK的压缩算法。这两个漏洞和相关算法可以点击链接查看更多的细节，不过这种漏洞主要存在于浏览器端，因为需要通过javascript来注入内容并观察payload的变化。

现在SPDY 使用的是通用的DEFLATE 算法，而 HTTP/2 则使用了专门为首部压缩而设计的 HPACK 算法。

http2.0使用encoder来减少需要传输的header大小，通讯双方各自cache一份header fields表，既避免了重复header的传输，又减小了需要传输的大小。高效的压缩算法可以很大的压缩header，减少发送包的数量从而降低延迟。

![http2](images/http5.jpg)

服务端推送（Server Push）

服务端推送是一种在客户端请求之前发送数据的机制。在 HTTP/2 中，服务器可以对客户端的一个请求发送多个响应。Server Push 让 HTTP1.x 时代使用内嵌资源的优化手段变得没有意义；如果一个请求是由你的主页发起的，服务器很可能会响应主页内容、logo 以及样式表，因为它知道客户端会用到这些东西。这相当于在一个 HTML 文档内集合了所有的资源，不过与之相比，服务器推送还有一个很大的优势：可以缓存！也让在遵循同源的情况下，不同页面之间可以共享缓存资源成为可能。

![http2](images/http6.jpg)

http2.0引入RST_STREAM类型的frame，可以在不断开连接的前提下取消某个request的stream，表现更好。

重置连接表现更好  
很多app客户端都有取消图片下载的功能场景，对于http1.x来说，是通过设置tcp segment里的reset flag来通知对端关闭连接的。这种方式会直接断开连接，下次再发请求就必须重新建立连接。http2.0引入RST_STREAM类型的frame，可以在不断开连接的前提下取消某个request的stream，表现更好。

流量控制（Flow Control）  
TCP协议通过sliding window的算法来做流量控制。发送方有个sending window，接收方有receive window。http2.0的flow control是类似receive window的做法，数据的接收方通过告知对方自己的flow window大小表明自己还能接收多少数据。只有Data类型的frame才有flow control的功能。对于flow control，如果接收方在flow window为零的情况下依然更多的frame，则会返回block类型的frame，这张场景一般表明http2.0的部署出了问题。

更安全的SSL  
HTTP2.0使用了tls的拓展ALPN来做协议升级，除此之外加密这块还有一个改动，HTTP2.0对tls的安全性做了近一步加强，通过黑名单机制禁用了几百种不再安全的加密算法，一些加密算法可能还在被继续使用。如果在ssl协商过程当中，客户端和server的cipher suite没有交集，直接就会导致协商失败，从而请求失败。在server端部署http2.0的时候要特别注意这一点。

## 4. chrome-performance页面性能分析

### 4.1. 模拟移动设备的CPU

移动设备的CPU一般比台式机和笔记本弱很多。当你想分析页面的时候，可以用CPU控制器（CPU Throttling）来模拟移动端设备CPU。

1. 在DevTools中，点击 Performance 的 tab。

2. 确保 Screenshots checkbox 被选中

3. 点击 Capture Settings（⚙️）按钮，DevTools会展示很多设置，来模拟各种状况

4. 对于模拟CPU，选择2x slowdown，于是Devtools就开始模拟两倍低速CPU

5. 在DevTools中，点击 Record 。这时候Devtools就开始录制各种性能指标

6. 进行快速操作，点击stop，处理数据，然后显示性能报告

### 4.2. 分析报告

FPS（frames per second）是用来分析动画的一个主要性能指标。让页面效果能够达到>=60fps(帧)/s的刷新频率以避免出现卡顿。能保持在60的FPS的话，那么用户体验就是不错的。

为什么是60fps?

我们的目标是保证页面要有高于每秒60fps(帧)的刷新频率，这和目前大多数显示器的刷新率相吻合(60Hz)。如果网页动画能够做到每秒60帧，就会跟显示器同步刷新，达到最佳的视觉效果。这意味着，一秒之内进行60次重新渲染，每次重新渲染的时间不能超过16.66毫秒。

### 4.3. 界面介绍

![performance](images/performanc1.jpg)

从上到下分别为4个区域

1. 具体条，包含录制，刷新页面分析，清除结果等一系列操作
2. overview总览图，高度概括随时间线的变动，包括FPS，CPU，NET
3. 火焰图，从不同的角度分析框选区域 。例如：Network，Frames, Interactions, Main等
4. 总结区域：精确到毫秒级的分析，以及按调用层级，事件分类的整理

![performance](images/performanc2.jpg)

【Overview】

Overview 窗格包含以下三个图表：

1. FPS。每秒帧数。绿色竖线越高，FPS 越高。 FPS 图表上的红色块表示长时间帧，很可能会出现卡顿

2. CPU。 CPU 资源。此面积图指示消耗 CPU 资源的事件类型

3. NET。每条彩色横杠表示一种资源。横杠越长，检索资源所需的时间越长。 每个横杠的浅色部分表示等待时间（从请求资源到第一个字节下载完成的时间）

可以放大显示一部分记录，以便简化分析。使用 Overview 窗格可以放大显示一部分记录。 放大后，火焰图会自动缩放以匹配同一部分

选择部分后，可以使用 W、A、S 和 D 键调整您的选择。 W 和 S 分别代表放大和缩小。 A 和 D 分别代表左移和右移

【火焰图】

在火焰图上看到一到三条垂直的虚线。蓝线代表 DOMContentLoaded 事件。 绿线代表首次绘制的时间。 红线代表 load 事件

在火焰图中选择事件时，Details 窗格会显示与事件相关的其他信息

【总结区域】

蓝色(Loading)：网络通信和HTML解析  
黄色(Scripting)：JavaScript执行  
紫色(Rendering)：样式计算和布局，即重排  
绿色(Painting)：重绘  
灰色(other)：其它事件花费的时间  
白色(Idle)：空闲时间  

Loading事件

![performance](images/performanc3.jpg)

Scripting事件

![performance](images/performanc4.jpg)

Rendering事件

![performance](images/performanc5.jpg)

Painting事件

![performance](images/performanc6.jpg)

> Rendering事件  

| 事件 | 描述 |
| --- | ---- |
| Invalidate layout | 当DOM更改导致页面布局失效时触发 |
| Layout | 页面布局计算执行时触发 |
| Recalculate style | Chrome重新计算元素样式时触发 |
| Scroll | 内嵌的视窗滚动时触发 |

> Painting事件  

| 事件 | 描述 |
| --- | ---- |
| Composite Layers | Chrome的渲染引擎完成图片层合并时触发 |
| Image Decode | 一个图片资源完成解码后触发 |
| Image Resize | 一个图片被修改尺寸后触发 |
| Paint | 合并后的层被绘制到对应显示区域后触发 |

参考资料：  
https://nicj.net/navigationtiming-in-practice/  
https://nicj.net/resourcetiming-in-practice/  
http://www.alloyteam.com/2020/01/14184/#prettyPhoto  
https://www.w3.org/TR/resource-timing-1/  
https://www.w3.org/TR/resource-timing-2/  
