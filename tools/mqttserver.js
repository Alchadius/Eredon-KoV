// Tiny MQTT 3.1.1-over-WebSocket relay (QoS0, exact topics) for local tests.
const http=require('http'),crypto=require('crypto');
const subs=new Map();
function wsframe(buf){let h;if(buf.length<126)h=Buffer.from([0x82,buf.length]);else if(buf.length<65536){h=Buffer.alloc(4);h[0]=0x82;h[1]=126;h.writeUInt16BE(buf.length,2);}else{h=Buffer.alloc(10);h[0]=0x82;h[1]=127;h.writeBigUInt64BE(BigInt(buf.length),2);}return Buffer.concat([h,buf]);}
function vl(n){const a=[];do{let b=n%128;n=Math.floor(n/128);if(n>0)b|=128;a.push(b);}while(n>0);return Buffer.from(a);}
const srv=http.createServer((q,r)=>r.end('mqtt'));
srv.on('upgrade',(req,sock)=>{
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Protocol: mqtt\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
  const send=b=>{try{sock.write(wsframe(b));}catch(e){}};const mine=new Set();let wbuf=Buffer.alloc(0),mbuf=Buffer.alloc(0);
  const onpkt=(h,body)=>{const t=h>>4;
    if(t===1)send(Buffer.from([0x20,2,0,0]));
    else if(t===8){const tl=body.readUInt16BE(2),topic=body.subarray(4,4+tl).toString();mine.add(topic);(subs.get(topic)||subs.set(topic,new Set()).get(topic)).add(send);send(Buffer.from([0x90,3,body[0],body[1],0]));}
    else if(t===3){const tl=body.readUInt16BE(0),topic=body.subarray(2,2+tl).toString();const out=Buffer.concat([Buffer.from([0x30]),vl(body.length),body]);(subs.get(topic)||[]).forEach(s=>s(out));}
    else if(t===12)send(Buffer.from([0xD0,0]));};
  const mq=()=>{for(;;){if(mbuf.length<2)return;let i=1,len=0,mul=1,b;do{if(i>=mbuf.length)return;b=mbuf[i++];len+=(b&127)*mul;mul*=128;}while(b&128);if(mbuf.length<i+len)return;const h=mbuf[0],body=mbuf.subarray(i,i+len);mbuf=mbuf.subarray(i+len);onpkt(h,body);}};
  sock.on('data',d=>{wbuf=Buffer.concat([wbuf,d]);for(;;){if(wbuf.length<2)return;let len=wbuf[1]&127,off=2;if(len===126){if(wbuf.length<4)return;len=wbuf.readUInt16BE(2);off=4;}else if(len===127){if(wbuf.length<10)return;len=Number(wbuf.readBigUInt64BE(2));off=10;}
    const masked=wbuf[1]&128;if(masked)off+=4;if(wbuf.length<off+len)return;const p=Buffer.from(wbuf.subarray(off,off+len));if(masked){const m=wbuf.subarray(off-4,off);for(let i=0;i<p.length;i++)p[i]^=m[i%4];}const op=wbuf[0]&15;wbuf=wbuf.subarray(off+len);if(op===8){sock.end();return;}if(op===2){mbuf=Buffer.concat([mbuf,p]);mq();}}});
  const gone=()=>{mine.forEach(t=>{const s=subs.get(t);if(s)s.delete(send);});};sock.on('close',gone);sock.on('error',gone);});
const port=+process.env.PORT||9100;srv.listen(port,()=>console.log('mqtt on',port));
