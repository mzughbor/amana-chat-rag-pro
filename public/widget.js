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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
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
  const chatUrl = `http://localhost:3000/widget/chat/${contextId}`;

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