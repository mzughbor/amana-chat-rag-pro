// This script enhances the static widget page with full chat functionality
(function () {
  'use strict';

  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }

  function initWidget() {
    // Get the container and context ID (either siteId or botId)
    const container = document.getElementById('amana-rag-widget-container');
    if (!container) return;

    const siteId = container.getAttribute('data-site-id');
    // In the future, we might also support data-bot-id
    
    if (!siteId) {
      console.error('AmanaRAG: siteId is required');
      return;
    }

    // Replace the placeholder with the actual chat interface
    container.innerHTML = `
      <div class="h-screen flex flex-col bg-white overflow-hidden">
        <!-- Header - Simplified for widget -->
        <div class="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3 border-b border-purple-500/20 flex-shrink-0">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-lg font-bold text-white">Chat Assistant</h1>
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
            <div class="mx-auto w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-3">
              <svg class="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
            <input type="text" id="amana-rag-input" placeholder="Type your message..." class="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-600 disabled:opacity-50 transition-all bg-white" />
            <button type="submit" id="amana-rag-send-button" class="px-3 py-2 text-sm flex-shrink-0 inline-flex items-center justify-center transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-medium shadow">
              Send
            </button>
          </div>
        </form>
      </div>
    `;

    // Initialize chat functionality
    initChatFunctionality(siteId);
  }

  function initChatFunctionality(contextId) {
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
        ? 'bg-purple-600 text-white'
        : 'bg-white text-slate-900 border border-gray-200 shadow-sm'
        }`;
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
            <div class="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce"></div>
            <div class="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
            <div class="w-1.5 h-1.5 bg-purple-600 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
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
          const errorData = await response.json().catch(() => ({}));
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