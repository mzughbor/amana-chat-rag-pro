(function () {
  'use strict';

  // Get parameters from query string
  const scriptSrc = document.currentScript?.src || '';
  const scriptParams = new URLSearchParams(scriptSrc.split('?')[1] || '');
  const siteId = scriptParams.get('siteId');
  const botId = scriptParams.get('botId'); // Support botId parameter as well
  const colorParam = scriptParams.get('color') || '6B46C1'; // Default purple
  const radiusParam = scriptParams.get('radius') || '50%'; // Default rounded

  // Either siteId or botId is required
  if (!siteId && !botId) {
    console.error('AmanaRAG: either siteId or botId is required');
    return;
  }

  // Use botId if provided, otherwise fall back to siteId
  const contextId = botId || siteId;

  // Parse color (add # if not present)
  const primaryColor = colorParam.startsWith('#') ? colorParam : `#${colorParam}`;

  // Parse border radius
  const borderRadius = radiusParam;

  // Create widget button
  const widgetButton = document.createElement('div');
  widgetButton.id = 'amana-rag-widget-button';
  widgetButton.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  `;
  widgetButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background-color: ${primaryColor};
    color: white;
    border-radius: ${borderRadius};
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  widgetButton.addEventListener('mouseenter', function () {
    this.style.transform = 'scale(1.1)';
    this.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });

  widgetButton.addEventListener('mouseleave', function () {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  // Create iframe for chat
  let chatIframe = null;
  // Use the widget-specific chat route with the contextId (either botId or siteId)
  // Always use the Render server domain instead of window.location.origin for external site embedding
  const WIDGET_SERVER_URL = 'https://amana-chat-rag-pro-yllr.onrender.com';
  const chatUrl = `${WIDGET_SERVER_URL}/widget/chat/${contextId}?color=${encodeURIComponent(colorParam)}&radius=${encodeURIComponent(radiusParam)}`;

  widgetButton.addEventListener('click', function () {
    if (chatIframe) {
      // Toggle iframe visibility
      chatIframe.style.display = chatIframe.style.display === 'none' ? 'block' : 'none';
      return;
    }

    // Create iframe
    chatIframe = document.createElement('iframe');
    chatIframe.src = chatUrl;
    chatIframe.style.cssText = `
      position: fixed;
      bottom: 90px;
      right: 20px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 110px);
      border: none;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: 9998;
      background: white;
    `;

    document.body.appendChild(chatIframe);

    // Listen for close message from iframe
    window.addEventListener('message', function (event) {
      if (event.data.type === 'CLOSE_WIDGET') {
        chatIframe.style.display = 'none';
      }
    });
  });

  // Append button to body
  document.body.appendChild(widgetButton);

  // Responsive adjustments
  function adjustForMobile() {
    if (window.innerWidth < 640) {
      if (chatIframe) {
        chatIframe.style.width = 'calc(100vw - 20px)';
        chatIframe.style.right = '10px';
        chatIframe.style.bottom = '80px';
      }
      widgetButton.style.width = '50px';
      widgetButton.style.height = '50px';
      widgetButton.style.bottom = '15px';
      widgetButton.style.right = '15px';
    } else {
      if (chatIframe) {
        chatIframe.style.width = '400px';
        chatIframe.style.right = '20px';
        chatIframe.style.bottom = '90px';
      }
      widgetButton.style.width = '60px';
      widgetButton.style.height = '60px';
      widgetButton.style.bottom = '20px';
      widgetButton.style.right = '20px';
    }
  }

  window.addEventListener('resize', adjustForMobile);
  adjustForMobile();
})();