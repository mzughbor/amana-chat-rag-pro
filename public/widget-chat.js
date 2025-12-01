// This script enhances the static widget page with full chat functionality
(function () {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  async function fetchBotInfo(botId) {
    try {
      // Use the public widget bot endpoint that doesn't require authentication
      const response = await fetch(`/api/widget/bot/${botId}`);
      
      if (!response.ok) {
        // Check if response is JSON before parsing
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          console.error('Failed to fetch bot info:', errorData.error || 'Unknown error');
        } else {
          // If it's HTML (like a 404 page), read as text
          const text = await response.text();
          console.error('Failed to fetch bot info: Server returned HTML instead of JSON');
        }
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch bot info:', error);
      return null;
    }
  }

  function initWidget() {
    // Get the container and context ID (either siteId or botId)
    const container = document.getElementById('amana-rag-widget-container');
    if (!container) return;

    const contextId = container.getAttribute('data-site-id');
    // In the future, we might also support data-bot-id

    if (!contextId) {
      console.error('AmanaRAG: contextId is required');
      return;
    }

    // Get color and other settings from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const colorParam = urlParams.get('color') || '6B46C1'; // Default purple
    const radiusParam = urlParams.get('radius') || '50%'; // Default rounded

    // Parse color (add # if not present)
    const primaryColor = colorParam.startsWith('#') ? colorParam : `#${colorParam}`;

    // Fetch bot info and then initialize the widget
    fetchBotInfo(contextId).then(botInfo => {
      const botName = botInfo?.name || 'Chat Assistant';

      // Replace the placeholder with the actual chat interface
      container.innerHTML = `
        <div class="h-screen flex flex-col bg-white overflow-hidden">
          <!-- Header - Simplified for widget -->
          <div class="widget-header px-4 py-3 border-b flex-shrink-0">
            <div class="flex items-center justify-between">
              <div>
                <h1 class="text-lg font-bold text-white">${botName}</h1>
              </div>
              <!-- Close button for widget -->
              <button id="amana-rag-close-button" class="p-1 rounded-lg hover:bg-white/10 transition-colors" title="Close chat">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div id="amana-rag-messages" class="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            <div class="text-center text-slate-700 mt-10">
              <div class="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-3" style="background-color: ${primaryColor}20;">
                <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <p class="text-base font-semibold text-slate-900 mb-1">Start a conversation</p>
              <p class="text-sm text-slate-600">Send a message to get started</p>
            </div>
          </div>

          <!-- Quick Replies -->
          <div id="amana-rag-quick-replies" class="px-3 pb-2 border-t border-gray-200 bg-white flex-shrink-0">
            <div class="flex flex-wrap gap-1.5 pt-2">
              <button class="amana-rag-quick-reply px-2.5 py-1.5 rounded-full text-xs bg-gray-100 text-slate-700 hover:bg-gray-200 transition-colors border border-gray-200" data-message="What can you help me with?">What can you help me with?</button>
              <button class="amana-rag-quick-reply px-2.5 py-1.5 rounded-full text-xs bg-gray-100 text-slate-700 hover:bg-gray-200 transition-colors border border-gray-200" data-message="Tell me about your services">Tell me about your services</button>
              <button class="amana-rag-quick-reply px-2.5 py-1.5 rounded-full text-xs bg-gray-100 text-slate-700 hover:bg-gray-200 transition-colors border border-gray-200" data-message="How do I get started?">How do I get started?</button>
            </div>
          </div>

          <!-- Input -->
          <form id="amana-rag-chat-form" class="border-t border-gray-200 bg-white p-3 flex-shrink-0">
            <div class="flex gap-2">
              <input type="text" id="amana-rag-input" placeholder="Type your message..." class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 transition-all bg-white" />
              <button type="submit" id="amana-rag-send-button" class="px-3 py-2 text-sm flex-shrink-0 inline-flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 rounded-2xl text-white font-medium shadow">
                Send
              </button>
            </div>
          </form>
        </div>
      `;

      // Apply dynamic styles after HTML is inserted
      const header = container.querySelector('.widget-header');
      if (header) {
        header.style.background = `linear-gradient(to right, ${primaryColor}, ${darkenColor(primaryColor, 10)})`;
        header.style.borderColor = `${primaryColor}80`; // 50% opacity
      }

      const sendButton = container.querySelector('#amana-rag-send-button');
      if (sendButton) {
        sendButton.style.backgroundColor = primaryColor;

        // Add hover effect
        sendButton.addEventListener('mouseenter', function () {
          this.style.backgroundColor = darkenColor(primaryColor, 10);
        });

        sendButton.addEventListener('mouseleave', function () {
          this.style.backgroundColor = primaryColor;
        });
      }

      const inputElement = container.querySelector('#amana-rag-input');
      if (inputElement) {
        // Add focus styles dynamically
        inputElement.addEventListener('focus', function () {
          this.style.borderColor = primaryColor;
          this.style.boxShadow = `0 0 0 3px ${primaryColor}33`;
        });

        inputElement.addEventListener('blur', function () {
          this.style.borderColor = '';
          this.style.boxShadow = '';
        });
      }

      // Initialize chat functionality
      initChatFunctionality(contextId, primaryColor);
    });
  }

  // Helper function to darken a color
  function darkenColor(color, percent) {
    // Remove # if present
    let hex = color.replace('#', '');

    // Convert to RGB
    let r = parseInt(hex.substring(0, 2), 16);
    let g = parseInt(hex.substring(2, 4), 16);
    let b = parseInt(hex.substring(4, 6), 16);

    // Darken
    r = Math.floor(r * (100 - percent) / 100);
    g = Math.floor(g * (100 - percent) / 100);
    b = Math.floor(b * (100 - percent) / 100);

    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  function initChatFunctionality(contextId, primaryColor) {
    // Get DOM elements
    const messagesContainer = document.getElementById('amana-rag-messages');
    const inputElement = document.getElementById('amana-rag-input');
    const formElement = document.getElementById('amana-rag-chat-form');
    const sendButton = document.getElementById('amana-rag-send-button');
    const closeButton = document.getElementById('amana-rag-close-button');
    const quickReplies = document.querySelectorAll('.amana-rag-quick-reply');

    // State variables
    let messages = [];
    let loading = false;

    // Scroll to bottom of messages
    function scrollToBottom() {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Add message to UI
    function addMessageToUI(message) {
      // Remove welcome message if this is the first real message
      if (messages.length === 0) {
        const welcomeMessage = messagesContainer.querySelector('.text-center');
        if (welcomeMessage) {
          welcomeMessage.remove();
        }
      }

      const messageElement = document.createElement('div');
      messageElement.className = `flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`;

      const contentElement = document.createElement('div');
      contentElement.className = `max-w-[85%] rounded-2xl px-3 py-2 ${message.role === 'user'
        ? 'text-white'
        : 'bg-white text-slate-900 border border-gray-200 shadow-sm'
        }`;

      if (message.role === 'user') {
        contentElement.style.backgroundColor = primaryColor;
      }

      contentElement.innerHTML = `<p class="text-sm leading-relaxed whitespace-pre-wrap">${message.content}</p>`;

      messageElement.appendChild(contentElement);
      messagesContainer.appendChild(messageElement);

      scrollToBottom();
    }

    // Show loading indicator
    function showLoading() {
      const loadingElement = document.createElement('div');
      loadingElement.className = 'flex justify-start';
      loadingElement.id = 'amana-rag-loading';
      loadingElement.innerHTML = `
        <div class="bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
          <div class="flex space-x-1">
            <div class="w-1.5 h-1.5 rounded-full animate-bounce" style="background-color: ${primaryColor};"></div>
            <div class="w-1.5 h-1.5 rounded-full animate-bounce" style="background-color: ${primaryColor}; animation-delay: 0.1s;"></div>
            <div class="w-1.5 h-1.5 rounded-full animate-bounce" style="background-color: ${primaryColor}; animation-delay: 0.2s;"></div>
          </div>
        </div>
      `;
      messagesContainer.appendChild(loadingElement);
      scrollToBottom();
    }

    // Hide loading indicator
    function hideLoading() {
      const loadingElement = document.getElementById('amana-rag-loading');
      if (loadingElement) {
        loadingElement.remove();
      }
    }

    // Send message to API
    async function sendMessage(message) {
      try {
        // Use the contextId (which can be either siteId or botId) for the API call
        const response = await fetch(`/api/chat/${contextId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message }),
        });

        if (!response.ok) {
          // Check if response is JSON before parsing
          const contentType = response.headers.get("content-type");
          let errorData = {};
          if (contentType && contentType.includes("application/json")) {
            errorData = await response.json().catch(() => ({}));
          } else {
            // If it's HTML (like a 404 page), read as text
            const text = await response.text();
            console.error('API returned HTML instead of JSON:', text.substring(0, 200));
            errorData = { error: `HTTP ${response.status} error` };
          }
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || errorData.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.response;
      } catch (error) {
        console.error('Error sending message:', error);
        // Provide more specific error messages based on the type of error
        if (error.message.includes('503')) {
          return 'Service temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('500')) {
          return 'Server error occurred. Please try again.';
        } else if (error.message.includes('404')) {
          return 'Bot or site not found. Please check your configuration.';
        } else {
          return 'Sorry, I encountered an error. Please try again.';
        }
      }
    }

    // Handle form submission
    formElement.addEventListener('submit', async function (e) {
      e.preventDefault();

      const message = inputElement.value.trim();
      if (!message || loading) return;

      // Add user message
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date(),
      };

      messages.push(userMessage);
      addMessageToUI(userMessage);

      // Clear input and disable form
      inputElement.value = '';
      loading = true;
      sendButton.disabled = true;

      // Show loading indicator
      showLoading();

      // Send message to API
      const response = await sendMessage(message);

      // Hide loading indicator
      hideLoading();

      // Add assistant message
      const assistantMessage = {
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      messages.push(assistantMessage);
      addMessageToUI(assistantMessage);

      // Re-enable form
      loading = false;
      sendButton.disabled = false;
      inputElement.focus();
    });

    // Handle quick replies
    quickReplies.forEach(button => {
      button.addEventListener('click', function () {
        const message = this.getAttribute('data-message');
        inputElement.value = message;

        // Trigger form submission
        const event = new Event('submit', { cancelable: true, bubbles: true });
        formElement.dispatchEvent(event);
      });
    });

    // Handle close button
    closeButton.addEventListener('click', function () {
      // Notify parent window to close the widget
      window.parent.postMessage({ type: 'CLOSE_WIDGET' }, '*');
    });

    // Focus input on load
    inputElement.focus();
  }
})();