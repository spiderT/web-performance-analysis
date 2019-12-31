import React, { Component } from 'react';
import './App.css';

export default class App extends Component {
  constructor(props) {
    super(props);
    this.state = {}
  }

  setMinWidth = (width) => {
    return Math.min(width / 3, 400)
  }

  computeBlockTiming = (res) => {
    let blockingTime = 0;
    if (res.connectEnd && res.connectEnd === res.fetchStart) {
      blockingTime = res.requestStart - res.connectEnd;
    } else if (res.domainLookupStart) {
      blockingTime = res.domainLookupStart - res.fetchStart;
    }
    return blockingTime;
  }

  render() {
    const mockData = {
      name: "http://api.hys-inc.cn/m.api?_mt=saber.queryUnfinishedAsyncConsult&__systime=1577289744318",
      entryType: "resource",
      startTime: 10144346.5,
      duration: 654.3999999985099,
      initiatorType: "xmlhttprequest",
      nextHopProtocol: "http/1.1",
      workerStart: 0,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 10144346.5,
      domainLookupStart: 10144346.5,
      domainLookupEnd: 10144346.5,
      connectStart: 10144346.5,
      connectEnd: 10144346.5,
      secureConnectionStart: 0,
      requestStart: 10144738.2,
      responseStart: 10145000.499999998,
      responseEnd: 10145000.899999999,
      transferSize: 799,
      encodedBodySize: 265,
      decodedBodySize: 366,

    //   "name": "https://api.hys-inc.cn/m.api?_mt=saber.getConfirmUrlV2&__systime=1577252595006",
    //   "entryType": "resource",
    //   "startTime": 11025000.599999912,
    //   "duration": 73.19999998435378,
    //   "initiatorType": "xmlhttprequest",
    //   "nextHopProtocol": "h2",
    //   "workerStart": 0,
    //   "redirectStart": 0,
    //   "redirectEnd": 0,
    //   "fetchStart": 11025000.599999912,
    //   "domainLookupStart": 0,
    //   "domainLookupEnd": 0,
    //   "connectStart": 0,
    //   "connectEnd": 0,
    //   "secureConnectionStart": 0,
    //   "requestStart": 0,
    //   "responseStart": 0,
    //   "responseEnd": 11025073.799999896,
    //   "transferSize": 0,
    //   "encodedBodySize": 0,
    //   "decodedBodySize": 0,
    //   "serverTiming": []
    }
    const { nextHopProtocol, duration, redirectStart, redirectEnd, fetchStart, domainLookupStart, domainLookupEnd, connectStart, connectEnd, requestStart, responseStart, responseEnd, secureConnectionStart} = mockData;
    const blockingTime = this.computeBlockTiming(mockData);
    const redirect = redirectEnd - redirectStart;
    // 如果domainLookupStart，实际时间是blockingTime
    const appCache = domainLookupStart ? 0 : Math.max(domainLookupStart - fetchStart, 0);
    const dns = domainLookupEnd - domainLookupStart;
    const tcp = connectEnd - connectStart;
    const ssl = secureConnectionStart ? (connectEnd - secureConnectionStart) : 0;
    const request = responseStart - requestStart;
    const response = responseStart === 0 ? (responseEnd - fetchStart) : (responseEnd - responseStart);
    console.log('ssl', ssl);
    return (
      <div className="performance-wrap">
        <p className="performance-head">
          <span className="performance-head-title">Protocol</span>
          <span className="performance-head-text">{nextHopProtocol}</span>
        </p>
        <p className="performance-head">
          <span className="performance-head-title">duration</span>
          <span className="performance-head-text">{duration.toFixed(2)}ms</span>
        </p>
        <div className="performance-item">
          <span className="performance-title">Redirect</span>
          <span className="performance-line performance-color-redirect" style={{ width: this.setMinWidth(redirect) }} />
          <span className="performance-time">{redirect.toFixed(2)}ms</span>
        </div>
        <div className="performance-item">
          <span className="performance-title">AppCache</span>
          <span className="performance-line performance-color-appcache" style={{ width: this.setMinWidth(appCache), marginLeft: this.setMinWidth(redirect + 1) }} />
          <span className="performance-time">{appCache.toFixed(2)}ms</span>
        </div>
        <div className="performance-item">
          <span className="performance-title">DNS</span>
          <span className="performance-line performance-color-dns" style={{ width: this.setMinWidth(dns), marginLeft: this.setMinWidth(appCache + redirect + 1) }} />
          <span className="performance-time">{dns.toFixed(2)}ms</span>
        </div>
        <div className="performance-item">
          <span className="performance-title">TCP</span>
          <span className="performance-line performance-color-tcp" style={{ width: this.setMinWidth(tcp), marginLeft: this.setMinWidth(appCache + redirect + dns + 1) }} />
          <span className="performance-time">{tcp.toFixed(2)}ms</span>
        </div>
        <div className="performance-item">
          <span className="performance-title">BlockingTime</span>
          <span className="performance-line performance-color-blockingTime" style={{ width: this.setMinWidth(blockingTime), marginLeft: this.setMinWidth(appCache + redirect + dns + tcp + 1) }} />
          <span className="performance-time">{blockingTime.toFixed(2)}ms</span>
        </div>
        <div className="performance-item">
          <span className="performance-title">SSL</span>
          <span className="performance-line performance-color-ssl" style={{ width: this.setMinWidth(ssl), marginLeft: this.setMinWidth(appCache + redirect + dns + tcp + blockingTime + 1) }} />
          <span className="performance-time">{ssl.toFixed(2)}ms</span>
        </div>
        <div className="performance-item">
          <span className="performance-title">Request</span>
          <span className="performance-line performance-color-request" style={{ width: this.setMinWidth(request), marginLeft: this.setMinWidth(appCache + redirect + dns + tcp + blockingTime + ssl + 1) }} />
          <span className="performance-time">{request.toFixed(2)}ms</span>
        </div>
        <div className="performance-item">
          <span className="performance-title">Response</span>
          <span className="performance-line performance-color-response" style={{ width: this.setMinWidth(response), marginLeft: this.setMinWidth(appCache + redirect + dns + tcp + blockingTime + ssl + request + 1) }} />
          <span className="performance-time">{response.toFixed(2)}ms</span>
        </div>
      </div>)
  }
}
