import React from 'react';
export default function LoadingScreen() {
  return (
    <div style={{ minHeight:'100vh', background:'#0A0A14', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Inter','Segoe UI',sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:52, height:52, borderRadius:14, background:'linear-gradient(135deg,#6366F1,#EC4899)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:24 }}>📡</div>
        <div style={{ color:'#64748B', fontSize:14, fontWeight:600 }}>Loading Blue Dot Networks...</div>
        <style>{`@keyframes pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>
      </div>
    </div>
  );
}
