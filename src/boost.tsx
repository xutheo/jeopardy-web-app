import React, { useEffect, useState } from 'react';
import { basePath } from './environment';
export function BoostCelebration() {
  const [visible, setVisible] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setVisible(false), 2300); return () => clearTimeout(timer); }, []);
  return visible ? <div className="boost-celebration" aria-hidden="true"><div className="boost-rays"/><div className="boost-emblem"><img src={basePath + 'qoobee-transparent.png'} alt=""/><strong>QOOBEE BOOST</strong><span>✦ ✦ ✦</span></div></div> : null;
}
