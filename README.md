# web-performance-analysis

参考资料：https://nicj.net/navigationtiming-in-practice/ https://nicj.net/resourcetiming-in-practice/

## 1. 介绍

ResourceTiming 是 W3C Web Performance working group  的 一个规范，目标是为了得到一个准确性能指标，对所有的资源下载页面加载期间的经历,比如图像、CSS和JavaScript。

ResourceTiming基于NavigationTiming，提供了更多的测量标准，例如，DNS, TCP, request, response 阶段, 和 “loaded” timestamp.

ResourceTiming灵感来自资源加载瀑布图，瀑布图展示了所有网络资源获取的时间表，可以快速的看到一些问题。下图是一个 Chrome Developer Tools的例子：

![瀑布图](images/waterfall.jpg)




