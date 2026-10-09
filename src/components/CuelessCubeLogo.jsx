import React from 'react';
import cuelessLogo from '../assets/Culess pic.jpg';
import './CuelessCubeLogo.css';

const FACES = ['front', 'right', 'back', 'left'];

/** Cueless logo on all four sides of a slowly spinning cube (homepage tile icon). */
export default function CuelessCubeLogo() {
  return (
    <span className="cueless-spin" aria-hidden="true">
      <span className="cueless-spin-inner">
        {FACES.map((face) => (
          <span key={face} className={`cueless-spin-face ${face}`}>
            <img src={cuelessLogo} alt="" />
          </span>
        ))}
      </span>
    </span>
  );
}
