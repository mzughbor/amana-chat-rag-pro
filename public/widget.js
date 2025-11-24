(function() {
  'use strict';

  // Get siteId from query parameter
  const urlParams = new URLSearchParams(window.location.search);
  const siteId = urlParams.get('siteId') || new URLSearchParams(document.currentScript?.src.split('?')[1] || '').get('siteId');

  if (!siteId) {
    console.error('AmanaRAG: siteId is required');
    return;
  }

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
    background-color: #6B46C1;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    z-index: 9999;
    transition: transform 0.2s, box-shadow 0.2s;
  `;

  widgetButton.addEventListener('mouseenter', function() {
    this.style.transform = 'scale(1.1)';
    this.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  });

  widgetButton.addEventListener('mouseleave', function() {
    this.style.transform = 'scale(1)';
    this.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  });

  // Create iframe for chat
  let chatIframe = null;
  // Fix: Use the correct route parameter (botId in new structure)
  const chatUrl = `${window.location.protocol}//${window.location.host}/chat/${siteId}`;

  widgetButton.addEventListener('click', function() {
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

