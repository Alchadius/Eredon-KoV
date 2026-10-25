// Minimal PeerJS-protocol-compatible signaling broker (raw WebSocket, no dependencies). Used for tests and as a self-hosted fallback.
const http=require('http'),crypto=require('crypto'),url=require('url');
const peers=new Map();
function frame(str){const b=Buffer.from(str);let h;if(b.length<126)h=Buffer.from([0x81,b.length]);else if(b.length<65536){h=Buffer.alloc(4);h[0]=0x81;h[1]=126;h.writeUInt16BE(b.length,2);}else{h=Buffer.alloc(10);h[0]=0x81;h[1]=127;h.writeBigUInt64BE(BigInt(b.length),2);}return Buffer.concat([h,b]);}
function parse(sock,buf,cb){sock.buf=Buffer.concat([sock.buf||Buffer.alloc(0),buf]);for(;;){const d=sock.buf;if(d.length<2)return;let len=d[1]&127,off=2;if(len===126){if(d.length<4)return;len=d.readUInt16BE(2);off=4;}else if(len===127){if(d.length<10)return;len=Number(d.readBigUInt64BE(2));off=10;}
  const masked=d[1]&128;if(masked)off+=4;if(d.length<off+len)return;let p=Buffer.from(d.subarray(off,off+len));if(masked){const m=d.subarray(off-4,off);for(let i=0;i<p.length;i++)p[i]^=m[i%4];}
  const op=d[0]&15;sock.buf=d.subarray(off+len);if(op===8){sock.end();return;}if(op===9){sock.write(Buffer.from([0x8a,0]));continue;}if(op===1)cb(p.toString());}}
const srv=http.createServer((q,r)=>{r.end('kov broker');});
srv.on('upgrade',(req,sock)=>{const u=url.parse(req.url,true),id=u.query.id;
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+crypto.createHash('sha1').update(req.headers['sec-websocket-key']+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64')+'\r\n\r\n');
  const send=o=>{try{sock.write(frame(JSON.stringify(o)));}catch(e){}};
  if(!id||peers.has(id)){send({type:'ID-TAKEN',payload:{msg:'ID is taken'}});sock.end();return;}
  peers.set(id,send);send({type:'OPEN'});
  sock.on('data',b=>parse(sock,b,s=>{let m;try{m=JSON.parse(s);}catch(e){return;}if(m.type==='HEARTBEAT')return;
    if(['OFFER','ANSWER','CANDIDATE','LEAVE','EXPIRE'].includes(m.type)){const t=peers.get(m.dst);if(t)t({type:m.type,src:id,dst:m.dst,payload:m.payload});else if(m.type!=='LEAVE'&&m.type!=='EXPIRE')send({type:'EXPIRE',src:m.dst});}}));
  const gone=()=>{if(peers.get(id)===send)peers.delete(id);};sock.on('close',gone);sock.on('error',gone);});
const port=+process.env.PORT||9000;srv.listen(port,()=>console.log('broker on',port));
