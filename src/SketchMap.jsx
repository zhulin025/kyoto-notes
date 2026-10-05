import React from 'react';
import {places} from './data';
export default function SketchMap({type='全部',selected,onSelect,route=[]}){
 const visible=places.filter(p=>(!route.length||route.includes(p.id))).filter(p=>type==='全部'||(type==='景点'?['景点','人文'].includes(p.type):type==='散步'?['散步','自然'].includes(p.type):p.type===type));
 return <div className="sketch-map"><svg viewBox="0 0 900 650" preserveAspectRatio="none" role="img" aria-label="京都手绘示意地图：北侧金阁寺、西侧岚山、东侧东山、南侧伏见与宇治。地图不按比例。">
 <defs><pattern id="grid" width="35" height="35" patternUnits="userSpaceOnUse"><path d="M35 0H0V35" fill="none" stroke="#e7e0cf" strokeWidth=".65"/></pattern><filter id="paper"><feTurbulence baseFrequency=".045" numOctaves="3" seed="8" type="fractalNoise"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".045"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter><g id="tree"><path d="M0 15V-5" stroke="#72836b" strokeWidth="2"/><path d="M-10 2 0-21 10 2M-8-6 0-29 8-6" fill="#b7c3a1" stroke="#7b8e72" strokeWidth="1.2"/></g><g id="hill"><path d="M-45 15Q-28-32-8-7Q9-48 36 11" fill="#d5ddc1" stroke="#a6b496" strokeWidth="1.5"/></g><g id="pagoda" stroke="#695e48" strokeWidth="1.5" strokeLinejoin="round"><path d="M-23 22V-2H23V22" fill="#dfba65"/><path d="M-32 0Q-19-4 0-17Q16-5 32 0Z" fill="#718171"/><path d="M-17-12V-29H17V-12" fill="#e6c473"/><path d="M-26-28Q-10-32 0-41Q13-32 26-28Z" fill="#657a67"/><path d="M0-41V-52M-24 22H25M-12 3V21M0 2V21M12 3V21"/></g><g id="gate" stroke="#a54a37" strokeWidth="5" fill="none"><path d="M-16 22V-15M16 22V-15M-25-18Q0-13 25-18M-22-7H22"/></g></defs>
 <rect width="900" height="650" fill="#f4efdf"/><rect width="900" height="650" fill="url(#grid)"/>
 <g filter="url(#paper)"><path d="M0 0H900V120Q847 143 826 251L849 400Q873 471 900 517V650H823Q844 546 789 463L772 198Q760 123 685 108L288 91Q175 138 164 271L100 372 0 413Z" fill="#e4e8d4"/>
 {[ [58,100],[138,61],[236,48],[440,53],[735,62],[821,137],[850,250],[850,377],[104,322],[46,269]].map(([x,y],i)=><use key={i} href="#hill" x={x} y={y}/>)}
 {[ [68,134],[182,109],[230,69],[386,54],[755,129],[834,206],[798,318],[861,431],[73,292],[130,219],[97,384],[824,520],[780,600]].map(([x,y],i)=><use key={i} href="#tree" x={x} y={y}/>)}
 <path d="M635-20Q584 76 610 152Q570 239 594 321Q575 402 610 472L634 570 630 680" fill="none" stroke="#b4c9c7" strokeWidth="18"/><path d="M635-20Q584 76 610 152Q570 239 594 321Q575 402 610 472L634 570 630 680" fill="none" stroke="#d9e5de" strokeWidth="7"/>
 <path d="M-20 303Q56 301 113 344T221 457Q258 518 390 569T510 655" fill="none" stroke="#b4c9c7" strokeWidth="20"/>
 <g fill="none" stroke="#d5c9b0" strokeWidth="3"><path d="M248 143L725 146M212 226L768 233M203 310L777 314M201 386L769 387M286 454L767 456M324 523L732 524M313 115L327 560M407 113L415 554M502 100L512 562M677 154L680 549"/></g>
 <path d="M95 284Q209 290 306 327L382 390 433 526 568 542 660 612" fill="none" stroke="#9b9d87" strokeWidth="3" strokeDasharray="7 6"/>
 <path d="M354 535H574" stroke="#777b68" strokeWidth="6"/><rect x="407" y="521" width="116" height="28" rx="4" fill="#f4efdf" stroke="#8b8e79"/>
 <text x="465" y="540" textAnchor="middle" fontSize="14" fill="#636850">京都站 KYOTO</text>
 <use href="#pagoda" x="314" y="133"/><use href="#pagoda" x="714" y="379"/><use href="#gate" x="602" y="536"/>
 <g fill="#8b967d" fontSize="25" fontFamily="serif" letterSpacing="6"><text x="70" y="237">岚山</text><text x="272" y="72">洛北</text><text x="390" y="263">洛中</text><text x="750" y="180">东山</text><text x="684" y="583">伏见</text></g>
 <text x="626" y="235" fill="#719391" fontSize="16" transform="rotate(85 626 235)">鸭 川 KAMOGAWA</text>
 <g transform="translate(821 58)" fill="none" stroke="#6c775f"><path d="M0-24V24M-10-10L0-24 10-10"/><text x="0" y="-32" textAnchor="middle" fill="#6c775f" stroke="none" fontSize="12">N</text></g>
 {route.length>1&&<path d={route.map((id,i)=>{const p=places.find(x=>x.id===id);return `${i?'L':'M'}${p.x*8.6+10} ${p.y*5.9+20}`}).join(' ')} stroke="#b75b45" strokeWidth="2.5" strokeDasharray="6 6" fill="none"/>}
 </g></svg>
 {visible.map(p=><button key={p.id} className={`map-pin ${selected===p.id?'selected':''} ${p.type==='美食'?'food':''}`} style={{left:`${(p.x*8.6+10)/9}%`,top:`${(p.y*5.9+20)/6.5}%`}} onClick={()=>onSelect(p)} aria-label={`查看${p.name}`}><span>{p.type==='美食'?'茶':p.type==='自然'?'森':'◈'}</span><b>{p.name}</b></button>)}
 <div className="map-note">手绘京都 / 非等比例示意图<br/>点击地点，开始你的探索</div>
 </div>
}
