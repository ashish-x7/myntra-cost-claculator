import React, { useState, useEffect, useRef } from 'react';
import chatbotImg from '../chatbot.png';

interface ChatMessage {
  type: 'bot' | 'user';
  text: string;
}

interface ChatState {
  userName: string | null;
  step: number;
  data: Record<string, number>;
}

const RANDOM_GREETINGS = [
  "Hii I'am AJ your friend how can i help you",
  "Need help with Myntra calculations? ⚡",
  "Type 'calculate' to start a step-by-step guide! 📖",
  "I can help you find the Final Purchase Cost! 💰",
  "Don't forget to export your results! ✅",
];

const STEPS = [
  {
    key: 'mrp',
    label: 'MRP Price',
    prompt: (name: string) => `Alright ${name}! First, please tell me the MRP Price: 💰`,
  },
  {
    key: 'margin',
    label: 'Purchase Margin %',
    prompt: (name: string) => `Thank you ${name}! Now, what is the Purchase Margin %? 📈`,
  },
  {
    key: 'tax',
    label: 'Tax (GST) %',
    prompt: (name: string) => `Got it ${name}! What is the Tax (GST) %? 🏛️`,
  },
  {
    key: 'commission',
    label: 'Myntra Commission %',
    prompt: (name: string) => `Great ${name}! Now what is the Myntra Commission %? 🛒`,
  },
  {
    key: 'fixedFee',
    label: 'Fixed Fee (Rs.)',
    prompt: (name: string) => `Almost there ${name}! What is the Fixed Fee (Rs.)? Last step! 🤝`,
  },
];

function calculateMyntraResult(d: Record<string, number>) {
  const purchaseCost = d.mrp * (1 - d.margin / 100) / (1 + d.tax / 100);
  const purchaseTax = purchaseCost * (d.tax / 100);
  const finalPurchaseCost = purchaseCost + purchaseTax;
  const channelPrice = d.mrp;
  const commission = channelPrice * (d.commission / 100);
  const settlement = channelPrice - commission - d.fixedFee;
  const profit = settlement - finalPurchaseCost;
  const profitPct = finalPurchaseCost > 0 ? (profit / finalPurchaseCost) * 100 : 0;

  return {
    purchaseCost: purchaseCost.toFixed(2),
    purchaseTax: purchaseTax.toFixed(2),
    finalPurchaseCost: finalPurchaseCost.toFixed(2),
    settlement: settlement.toFixed(2),
    profit: profit.toFixed(2),
    profitPct: profitPct.toFixed(2),
  };
}

const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { type: 'bot', text: "Hello! I'm AJ, your dashboard friend. ✨ Before we start, may I know your name? 😊" },
  ]);
  const [inputText, setInputText] = useState('');
  const [chatState, setChatState] = useState<ChatState>({ userName: null, step: 0, data: {} });
  const [bubbleText, setBubbleText] = useState('');
  const [showBubble, setShowBubble] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleIndexRef = useRef(0);
  const typewriterRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setShowBubble(false);
    }
  }, [isOpen]);

  // Rotating greeting bubble
  useEffect(() => {
    const typeWriter = (text: string, i: number, onDone: () => void) => {
      if (i < text.length) {
        setBubbleText(prev => prev + text.charAt(i));
        typewriterRef.current = setTimeout(() => typeWriter(text, i + 1, onDone), 50);
      } else {
        onDone();
      }
    };

    const rotate = () => {
      if (isOpen) return;
      const msg = RANDOM_GREETINGS[bubbleIndexRef.current % RANDOM_GREETINGS.length];
      bubbleIndexRef.current++;
      setBubbleText('');
      setShowBubble(true);
      typeWriter(msg, 0, () => {
        setTimeout(() => setShowBubble(false), 6000);
      });
    };

    const initialTimer = setTimeout(rotate, 2000);
    const interval = setInterval(rotate, 12000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      if (typewriterRef.current) clearTimeout(typewriterRef.current);
    };
  }, [isOpen]);

  const appendMessage = (type: 'bot' | 'user', text: string) => {
    setMessages(prev => [...prev, { type, text }]);
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    appendMessage('user', text);

    // Step 1: Get user name
    if (!chatState.userName) {
      const name = text;
      setChatState(prev => ({ ...prev, userName: name }));
      appendMessage(
        'bot',
        `Nice to meet you, ${name}! 👋 How can I help you today? You can type "calculate" to start a guided cost check! ✨`
      );
      return;
    }

    const numVal = parseFloat(text);

    // Start calculation flow
    if (text.toLowerCase().includes('calculate') || text.toLowerCase().includes('cost')) {
      setChatState(prev => ({ ...prev, step: 1, data: {} }));
      appendMessage('bot', STEPS[0].prompt(chatState.userName!));
      return;
    }

    // In guided calculation flow
    if (chatState.step > 0 && chatState.step <= STEPS.length) {
      if (isNaN(numVal)) {
        appendMessage('bot', `Kripya ek sahi number batayein ${STEPS[chatState.step - 1].label} ke liye. 🔢`);
        return;
      }

      const newData = { ...chatState.data, [STEPS[chatState.step - 1].key]: numVal };

      if (chatState.step < STEPS.length) {
        setChatState(prev => ({ ...prev, step: prev.step + 1, data: newData }));
        appendMessage('bot', STEPS[chatState.step].prompt(chatState.userName!));
      } else {
        // Final calculation
        setChatState(prev => ({ ...prev, step: 0, data: {} }));
        const result = calculateMyntraResult(newData);
        appendMessage(
          'bot',
          `Alright ${chatState.userName}, your calculation is ready! ✨\n\n` +
          `🧾 Purchase Cost: ₹${result.purchaseCost}\n` +
          `💸 Purchase Tax: ₹${result.purchaseTax}\n` +
          `📦 Final Purchase Cost: ₹${result.finalPurchaseCost}\n` +
          `🏦 Myntra Settlement: ₹${result.settlement}\n` +
          `📈 Profit/Loss: ₹${result.profit} (${result.profitPct}%)\n\n` +
          `Is there anything else I can help you with? 😊`
        );
      }
      return;
    }

    // Free-form AI chat via backend
    setIsTyping(true);
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, userName: chatState.userName }),
      });

      const data = await response.json();
      appendMessage('bot', data.reply || "Koi response nahi mila. 😔");
    } catch {
      appendMessage('bot', "I'm sorry, I'm having trouble connecting right now. 😔");
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') sendMessage();
  };

  return (
    <>
      {/* Styles */}
      <style>{`
        .aj-bubble {
          position: fixed;
          bottom: 110px;
          right: 35px;
          background: rgba(255, 255, 255, 0.95);
          border: 2px solid rgba(110, 140, 255, 0.3);
          border-radius: 18px 18px 0 18px;
          padding: 12px 18px;
          max-width: 210px;
          font-size: 13px;
          font-weight: 400;
          color: #4762b4;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 2000;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          pointer-events: none;
          backdrop-filter: blur(10px);
          font-family: "Calibri", "Segoe UI", sans-serif;
        }
        .aj-bubble.show {
          opacity: 1;
          transform: translateY(0);
        }
        .aj-trigger {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 70px;
          height: 70px;
          z-index: 2000;
          cursor: pointer;
          animation: aj-float 3s ease-in-out infinite;
          filter: drop-shadow(0 10px 20px rgba(71, 98, 180, 0.25));
          background: none;
          border: none;
          padding: 0;
        }
        .aj-trigger:hover {
          transform: none;
          box-shadow: none;
          background: none;
        }
        @keyframes aj-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(5deg); }
        }
        .aj-trigger img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .aj-window {
          position: fixed;
          bottom: 110px;
          right: 30px;
          width: 380px;
          height: 550px;
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(240,253,244,0.96));
          border: 1px solid rgba(255,255,255,0.8);
          border-radius: 30px;
          box-shadow: 0 25px 60px rgba(15, 23, 42, 0.25);
          z-index: 1999;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transform: scale(0.9) translateY(40px);
          opacity: 0;
          visibility: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          backdrop-filter: blur(25px);
          font-family: "Calibri", "Segoe UI", sans-serif;
        }
        .aj-window.open {
          opacity: 1;
          visibility: visible;
          transform: scale(1) translateY(0);
        }
        .aj-header {
          padding: 20px;
          background: linear-gradient(90deg, #4ade80, #6e8cff, #fb7185);
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .aj-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        .aj-close {
          cursor: pointer;
          font-size: 22px;
          background: none !important;
          border: none !important;
          color: white !important;
          padding: 0 !important;
          box-shadow: none !important;
          line-height: 1;
          opacity: 0.9;
          transition: opacity 0.2s;
          animation: none !important;
        }
        .aj-close:hover {
          opacity: 1;
          transform: none !important;
          background: none !important;
          box-shadow: none !important;
        }
        .aj-messages {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: rgba(255,255,255,0.2);
        }
        .aj-msg {
          max-width: 82%;
          padding: 10px 14px;
          border-radius: 16px;
          font-size: 14px;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .aj-msg.bot {
          align-self: flex-start;
          background: white;
          color: #1e293b;
          border-bottom-left-radius: 4px;
          box-shadow: 0 4px 10px rgba(112,135,168,0.08);
          border: 1px solid rgba(110,140,255,0.1);
        }
        .aj-msg.user {
          align-self: flex-end;
          background: linear-gradient(135deg, #6e8cff, #8ba3ff);
          color: white;
          border-bottom-right-radius: 4px;
          box-shadow: 0 4px 12px rgba(110,140,255,0.2);
        }
        .aj-typing {
          align-self: flex-start;
          background: white;
          border: 1px solid rgba(110,140,255,0.1);
          border-radius: 16px;
          border-bottom-left-radius: 4px;
          padding: 12px 16px;
          box-shadow: 0 4px 10px rgba(112,135,168,0.08);
          display: flex;
          gap: 5px;
          align-items: center;
        }
        .aj-dot {
          width: 7px;
          height: 7px;
          background: #6e8cff;
          border-radius: 50%;
          animation: aj-bounce 1.2s infinite;
        }
        .aj-dot:nth-child(2) { animation-delay: 0.2s; }
        .aj-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes aj-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        .aj-input-area {
          padding: 14px 16px;
          display: flex;
          gap: 8px;
          background: white;
          border-top: 1px solid rgba(124,145,180,0.1);
          flex-shrink: 0;
        }
        .aj-input-area input {
          flex: 1;
          padding: 10px 16px;
          border: 2px solid #f1f5f9;
          border-radius: 12px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.3s;
          font-family: "Calibri", "Segoe UI", sans-serif;
          background: white !important;
          color: #1e293b !important;
          box-shadow: none !important;
        }
        .aj-input-area input:focus {
          border-color: #6e8cff;
          background: white !important;
          box-shadow: none !important;
        }
        .aj-send-btn {
          background: linear-gradient(135deg, #4ade80, #22c55e) !important;
          color: white !important;
          border: none !important;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px;
          border-radius: 10px !important;
          cursor: pointer;
          display: flex !important;
          align-items: center;
          justify-content: center;
          font-size: 18px !important;
          padding: 0 !important;
          box-shadow: 0 4px 12px rgba(34,197,94,0.3) !important;
          flex-shrink: 0;
          animation: none !important;
        }
        .aj-send-btn:hover {
          transform: translateY(-1px) !important;
          box-shadow: 0 6px 16px rgba(34,197,94,0.4) !important;
          background: linear-gradient(135deg, #4ade80, #22c55e) !important;
        }
        @media (max-width: 480px) {
          .aj-window {
            width: calc(100vw - 20px);
            right: 10px;
            bottom: 100px;
          }
        }
      `}</style>

      {/* Greeting Bubble */}
      <div className={`aj-bubble${showBubble && !isOpen ? ' show' : ''}`}>
        {bubbleText}
      </div>

      {/* Floating Bot Button */}
      <button className="aj-trigger" onClick={() => setIsOpen(o => !o)} aria-label="Open AJ Chatbot">
        <img src={chatbotImg} alt="AJ" />
      </button>

      {/* Chat Window */}
      <div className={`aj-window${isOpen ? ' open' : ''}`}>
        {/* Header */}
        <div className="aj-header">
          <h3>AJ — Dashboard Friend</h3>
          <button className="aj-close" onClick={() => setIsOpen(false)}>×</button>
        </div>

        {/* Messages */}
        <div className="aj-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`aj-msg ${msg.type}`}>
              {msg.text}
            </div>
          ))}
          {isTyping && (
            <div className="aj-typing">
              <div className="aj-dot" />
              <div className="aj-dot" />
              <div className="aj-dot" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="aj-input-area">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type your message..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="aj-send-btn" onClick={sendMessage} aria-label="Send">
            ➤
          </button>
        </div>
      </div>
    </>
  );
};

export default Chatbot;
