/* Векторные иконки и иллюстрации (доверенные константы, без внешних файлов). */
(function (g) {
  'use strict';
  var CC = g.CC = g.CC || {};
  function sv(body, vb) {
    return '<svg viewBox="' + (vb || '0 0 24 24') + '" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }
  var I = {
    logo: '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><rect x="2" y="2" width="44" height="44" rx="12" fill="#151515"/><rect x="9" y="10" width="30" height="20" rx="3" fill="none" stroke="#FFC400" stroke-width="3"/><path d="M24 30v5M16 38h16" stroke="#FFC400" stroke-width="3" stroke-linecap="round"/><path d="M15 20h6M18 17v6" stroke="#FFC400" stroke-width="2.6" stroke-linecap="round"/><circle cx="29" cy="18" r="1.9" fill="#FFC400"/><circle cx="33" cy="22" r="1.9" fill="#FFC400"/></svg>',
    capital: sv('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M10 13.5h3.2a1.6 1.6 0 0 0 0-3.2H10v6M9 15h4"/>'),
    income: sv('<path d="M3 17l6-6 4 4 7-8"/><path d="M15 7h5v5"/>'),
    power: sv('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12.5 6.5l-2.5 4h3l-2.5 4"/><path d="M8 20h8M12 16v4"/>'),
    reach: sv('<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>'),
    cost: sv('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>'),
    price: sv('<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>'),
    star: sv('<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'),
    starFill: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>',
    info: sv('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
    menu: sv('<path d="M4 6h16M4 12h16M4 18h16"/>'),
    close: sv('<path d="M6 6l12 12M18 6L6 18"/>'),
    play: sv('<path d="M7 5l12 7-12 7z"/>'),
    pause: sv('<path d="M8 5v14M16 5v14"/>'),
    next: sv('<path d="M5 5l9 7-9 7z"/><path d="M18 5v14"/>'),
    chevronUp: sv('<path d="M6 15l6-6 6 6"/>'),
    chevronDown: sv('<path d="M6 9l6 6 6-6"/>'),
    overview: sv('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>'),
    hall: sv('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 10h4M9 8v4"/><circle cx="16" cy="9" r=".6"/><circle cx="17.5" cy="11.5" r=".6"/>'),
    staff: sv('<circle cx="12" cy="7" r="3.5"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M10 14.5l2 3 2-3"/>'),
    marketing: sv('<path d="M3 10v4h4l8 5V5L7 10z"/><path d="M18 9a4 4 0 0 1 0 6"/>'),
    finance: sv('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
    goal: sv('<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>'),
    trophy: sv('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4"/><path d="M12 13v4M8 21h8M9.5 17h5"/>'),
    settings: sv('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>'),
    help: sv('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17v.5"/>'),
    wrench: sv('<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L3 18l3 3 6.2-6.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>'),
    lock: sv('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
    plus: sv('<path d="M12 5v14M5 12h14"/>'),
    minus: sv('<path d="M5 12h14"/>'),
    check: sv('<path d="M5 12l5 5 9-10"/>'),
    warn: sv('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.3"/>'),
    download: sv('<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>'),
    upload: sv('<path d="M12 20V9M7 14l5-5 5 5M4 4h16"/>'),
    refresh: sv('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>'),
    plan: sv('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v3h6V3"/><path d="M8.5 11l1.5 1.5 3-3M8.5 16.5l1.5 1.5 3-3"/>'),
    legal: sv('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><circle cx="12" cy="15" r="2.6"/><path d="M10.5 17.2L10 21l2-1 2 1-.5-3.8"/>'),
    rent: sv('<path d="M3 21V9l9-6 9 6v12"/><path d="M9 21v-6h6v6"/><circle cx="17" cy="11" r="1"/>'),
    equip: sv('<rect x="2" y="5" width="9" height="7" rx="1"/><rect x="13" y="5" width="9" height="7" rx="1"/><path d="M6.5 12v3M17.5 12v3M4 15h5M15 15h5"/><rect x="5" y="17" width="14" height="4" rx="1"/>'),
    event: sv('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    office: sv('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4M7 8h6M7 11h4"/>'),
    gaming: sv('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/><path d="M8 10h4M10 8v4"/><circle cx="15" cy="9" r=".8"/><circle cx="16.5" cy="11.5" r=".8"/>'),
    top: sv('<rect x="2" y="3" width="20" height="13" rx="1.5"/><path d="M8 21h8M12 16v5"/><path d="M6 13l3-4 3 3 3-5 3 6"/>'),
    console: sv('<path d="M6 8h12a4 4 0 0 1 3.9 4.8l-.8 3.8a2.3 2.3 0 0 1-4 1L15 15H9l-2.1 2.6a2.3 2.3 0 0 1-4-1l-.8-3.8A4 4 0 0 1 6 8z"/><path d="M7 11.5h3M8.5 10v3"/><circle cx="16" cy="11" r=".7"/><circle cx="17.5" cy="13" r=".7"/>'),
    vr: sv('<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-4l-2-3h-2l-2 3H5a2 2 0 0 1-2-2z"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/>'),
    admin: sv('<circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/><path d="M15.5 5.5c1.5.3 2.5 1.5 2.5 3"/>'),
    tech: sv('<circle cx="12" cy="12" r="3"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'),
    cleaner: sv('<path d="M14 3l-3 9"/><path d="M8 12h8l2 9H6z"/><path d="M10 16v5M14 16v5"/>'),
    smm: sv('<rect x="6" y="2" width="12" height="20" rx="2.5"/><path d="M12 9.5c-1-1.7-4-1-3 1.3L12 14l3-3.2c1-2.3-2-3-3-1.3z"/><path d="M10.5 18.5h3"/>'),
    loan: sv('<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 21h18"/>'),
    sound: sv('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
    theme: sv('<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>'),
    calendar: sv('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
    bolt: sv('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
    sofa: sv('<path d="M4 11V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2z"/><path d="M5 18v2M19 18v2"/>'),
    wifi: sv('<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r=".8"/>')
  };

  // Иллюстрации для сюжетных шагов (viewBox 320×150)
  var Y = '#FFC400', K = '#151515', W = '#ffffff', G = '#d9d9d9', C = '#33c6ff', M = '#ff4fa3';
  function art(body) {
    return '<svg viewBox="0 0 320 150" role="img" aria-hidden="true" focusable="false" class="art-svg">' +
      '<rect width="320" height="150" rx="14" fill="' + Y + '"/>' + body + '</svg>';
  }
  var ARTS = {
    plan: art('<rect x="20" y="18" width="190" height="112" rx="8" fill="' + W + '" stroke="' + K + '" stroke-width="4"/>' +
      '<rect x="40" y="90" width="16" height="26" fill="' + K + '"/><rect x="64" y="74" width="16" height="42" fill="' + K + '"/><rect x="88" y="58" width="16" height="58" fill="' + K + '"/><rect x="112" y="40" width="16" height="76" fill="' + Y + '" stroke="' + K + '" stroke-width="3"/>' +
      '<path d="M40 70l24-14 24 6 30-28" stroke="' + M + '" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="168" cy="62" r="22" fill="none" stroke="' + K + '" stroke-width="4"/><path d="M168 62V40A22 22 0 0 1 190 62z" fill="' + K + '"/>' +
      '<circle cx="262" cy="52" r="18" fill="' + K + '"/><path d="M232 134c0-28 13-50 30-50s30 22 30 50z" fill="' + K + '"/><path d="M240 98l-34-18" stroke="' + K + '" stroke-width="8" stroke-linecap="round"/>'),
    legal: art('<rect x="70" y="16" width="120" height="120" rx="8" fill="' + W + '" stroke="' + K + '" stroke-width="4"/>' +
      '<path d="M90 42h80M90 58h80M90 74h56M90 90h66" stroke="' + K + '" stroke-width="5" stroke-linecap="round"/>' +
      '<circle cx="160" cy="112" r="20" fill="none" stroke="' + M + '" stroke-width="5"/><path d="M151 112l7 7 12-14" stroke="' + M + '" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<rect x="214" y="30" width="22" height="96" rx="4" fill="' + K + '" transform="rotate(25 225 78)"/><path d="M228 120l8 18 6-20z" fill="' + K + '"/>'),
    rent: art('<rect x="40" y="40" width="150" height="96" fill="' + W + '" stroke="' + K + '" stroke-width="4"/><path d="M30 44l85-30 85 30z" fill="' + K + '"/>' +
      '<rect x="60" y="66" width="34" height="30" fill="' + C + '" stroke="' + K + '" stroke-width="3"/><rect x="136" y="66" width="34" height="30" fill="' + C + '" stroke="' + K + '" stroke-width="3"/><rect x="100" y="92" width="30" height="44" fill="' + K + '"/>' +
      '<rect x="70" y="50" width="90" height="12" rx="3" fill="' + Y + '" stroke="' + K + '" stroke-width="2"/>' +
      '<circle cx="250" cy="62" r="20" fill="none" stroke="' + K + '" stroke-width="8"/><path d="M250 82v50M250 108h16M250 122h12" stroke="' + K + '" stroke-width="8" stroke-linecap="round"/>'),
    equip: art('<g stroke="' + K + '" stroke-width="4"><rect x="18" y="24" width="86" height="58" rx="5" fill="' + K + '"/><rect x="117" y="24" width="86" height="58" rx="5" fill="' + K + '"/><rect x="216" y="24" width="86" height="58" rx="5" fill="' + K + '"/></g>' +
      '<path d="M28 70l18-22 14 12 14-20 20 30" stroke="' + C + '" stroke-width="4" fill="none"/><path d="M128 72h60M128 60h44M128 48h64" stroke="' + Y + '" stroke-width="4"/><circle cx="259" cy="53" r="16" fill="none" stroke="' + M + '" stroke-width="4"/>' +
      '<path d="M61 82v14M160 82v14M259 82v14" stroke="' + K + '" stroke-width="6"/><rect x="10" y="98" width="300" height="12" rx="4" fill="' + K + '"/>' +
      '<rect x="40" y="116" width="50" height="10" rx="5" fill="' + W + '" stroke="' + K + '" stroke-width="3"/><rect x="138" y="116" width="50" height="10" rx="5" fill="' + W + '" stroke="' + K + '" stroke-width="3"/><rect x="236" y="116" width="50" height="10" rx="5" fill="' + W + '" stroke="' + K + '" stroke-width="3"/>'),
    staff: art('<g fill="' + K + '"><circle cx="80" cy="54" r="20"/><path d="M42 136c0-34 17-56 38-56s38 22 38 56z"/><circle cx="240" cy="54" r="20"/><path d="M202 136c0-34 17-56 38-56s38 22 38 56z"/></g>' +
      '<circle cx="160" cy="46" r="23" fill="' + W + '" stroke="' + K + '" stroke-width="4"/><path d="M116 140c0-38 20-62 44-62s44 24 44 62z" fill="' + W + '" stroke="' + K + '" stroke-width="4"/>' +
      '<rect x="146" y="98" width="28" height="18" rx="3" fill="' + Y + '" stroke="' + K + '" stroke-width="3"/><rect x="68" y="98" width="24" height="14" rx="3" fill="' + C + '"/><rect x="228" y="98" width="24" height="14" rx="3" fill="' + M + '"/>'),
    marketing: art('<path d="M60 64v26h24l70 38V26L84 64z" fill="' + K + '"/><rect x="66" y="90" width="18" height="34" rx="4" fill="' + K + '"/>' +
      '<path d="M176 52a40 40 0 0 1 0 50M196 36a64 64 0 0 1 0 82" stroke="' + K + '" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M256 50c-6-12-26-8-20 8l20 20 20-20c6-16-14-20-20-8z" fill="' + M + '" stroke="' + K + '" stroke-width="3"/>' +
      '<rect x="230" y="96" width="62" height="30" rx="8" fill="' + W + '" stroke="' + K + '" stroke-width="3"/><path d="M244 111h34" stroke="' + K + '" stroke-width="4" stroke-linecap="round"/>'),
    open: art('<rect x="100" y="20" width="120" height="120" rx="6" fill="' + K + '"/><rect x="112" y="32" width="96" height="108" fill="' + C + '"/>' +
      '<rect x="120" y="58" width="80" height="26" rx="5" fill="' + Y + '" stroke="' + K + '" stroke-width="3"/><path d="M134 71h52" stroke="' + K + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M20 50l70 40M300 50l-70 40" stroke="' + M + '" stroke-width="8" stroke-linecap="round"/>' +
      '<g fill="' + K + '"><circle cx="40" cy="120" r="5"/><circle cx="70" cy="20" r="4"/><circle cx="280" cy="118" r="5"/><circle cx="252" cy="24" r="4"/><rect x="30" y="80" width="8" height="8" transform="rotate(30 34 84)"/><rect x="276" y="76" width="8" height="8" transform="rotate(30 280 80)"/></g>'),
    goal: art('<path d="M110 136V18" stroke="' + K + '" stroke-width="8" stroke-linecap="round"/><path d="M114 20h96l-20 26 20 26h-96z" fill="' + K + '"/>' +
      '<path d="M140 34l6 12 13 2-9 9 2 13-12-6-12 6 2-13-9-9 13-2z" fill="' + Y + '"/><rect x="70" y="128" width="80" height="10" rx="5" fill="' + K + '"/>'),
    win: art('<path d="M120 22h80v40a40 40 0 0 1-80 0z" fill="' + K + '"/><path d="M120 34H96a24 24 0 0 0 26 30M200 34h24a24 24 0 0 1-26 30" stroke="' + K + '" stroke-width="7" fill="none"/>' +
      '<rect x="150" y="100" width="20" height="20" fill="' + K + '"/><rect x="124" y="120" width="72" height="16" rx="4" fill="' + K + '"/>' +
      '<path d="M160 36l5 11 12 2-9 8 2 12-10-6-10 6 2-12-9-8 12-2z" fill="' + Y + '"/>' +
      '<g fill="' + W + '" stroke="' + K + '" stroke-width="2"><path d="M50 40l4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1z"/><path d="M270 60l4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1z"/></g>'),
    event: art('<circle cx="160" cy="75" r="56" fill="' + K + '"/><path d="M172 30l-38 52h26l-8 40 38-54h-26z" fill="' + Y + '"/>' +
      '<path d="M40 40h40M30 60h50M240 90h50M240 110h40" stroke="' + K + '" stroke-width="6" stroke-linecap="round"/>'),
    bankrupt: art('<path d="M30 30l70 40 50-20 80 60 50-10" stroke="' + K + '" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M268 92l14 20-24 4" stroke="' + K + '" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<rect x="40" y="104" width="120" height="30" rx="6" fill="' + W + '" stroke="' + K + '" stroke-width="4"/><path d="M58 119h84" stroke="' + M + '" stroke-width="5" stroke-linecap="round"/>'),
    chart: art('<rect x="20" y="20" width="280" height="110" rx="8" fill="' + W + '" stroke="' + K + '" stroke-width="4"/>' +
      '<path d="M40 110l40-30 40 16 40-40 40 20 40-36 30 6" stroke="' + K + '" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="160" cy="56" r="7" fill="' + Y + '" stroke="' + K + '" stroke-width="3"/>')
  };

  // Возвращает <span> с иконкой; разметка — доверенная константа из этого файла
  CC.icon = function (name, cls) {
    var span = document.createElement('span');
    span.className = 'ico' + (cls ? ' ' + cls : '');
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = I[name] || I.info;
    return span;
  };
  CC.art = function (name) {
    var div = document.createElement('div');
    div.className = 'art';
    div.innerHTML = ARTS[name] || ARTS.chart;
    return div;
  };
  CC.ICONS = I; CC.ARTS = ARTS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
