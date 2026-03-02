import https from 'https';
import readline from 'readline';

const API_KEY = process.env.MS_API_KEY || 'ms-80414355-b0d6-4e1f-82cd-35ad1cd42561';
const MODEL_ID = process.argv[2];

if (!MODEL_ID) {
  console.error("Usage: node probe.mjs <Model/ID>");
  console.error("Example: node probe.mjs MiniMax/MiniMax-M2.5");
  process.exit(1);
}

const BASE_URL = 'api-inference.modelscope.cn';
const PATH = '/v1/chat/completions';

const LOG = (msg) => process.stdout.write(msg);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function makeRequest(payloadName, payload) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: MODEL_ID,
      messages: [{ role: 'user', content: 'Compare 9.11 and 9.8. Think step by step before answering.' }],
      stream: false, // Using false to get the full JSON cleanly and avoid stream parsing issues
      ...payload
    });

    const options = {
      hostname: BASE_URL,
      port: 443,
      path: PATH,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          
          // Check for the "fake 200" where choices is null
          if (res.statusCode === 200 && (!parsed.choices || parsed.choices === null || parsed.choices.length === 0)) {
            resolve({ statusCode: 400, hasReasoning: false, error: "Choices null (Strict rejection)", validContent: false });
            return;
          }

          let hasReasoning = false;
          let validContent = false;

          if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
            const msg = parsed.choices[0].message;
            if (msg.reasoning_content && msg.reasoning_content.trim() !== '') {
               hasReasoning = true;
            }
            if (msg.content && msg.content.trim() !== '') {
               validContent = true;
            }
          }

          resolve({ statusCode: res.statusCode, hasReasoning, error: null, validContent });
        } catch(e) {
          resolve({ statusCode: res.statusCode, hasReasoning: false, error: "Failed to parse JSON", validContent: false });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ statusCode: 500, hasReasoning: false, error: error.message, validContent: false });
    });

    req.write(data);
    req.end();
  });
}

async function runProbe() {
  console.log(`\n🔍 [PROBE STARTED] Target: ${MODEL_ID}\n`);

  // 1. Baseline Test
  LOG("👉 1. Testing Baseline (Standard Format)... ");
  const baseRes = await makeRequest("baseline", {});
  if (baseRes.statusCode === 200 && baseRes.validContent) {
    LOG(`✅ PASS (Reasoning present by default: ${baseRes.hasReasoning ? 'YES 🧠' : 'NO'})\n`);
  } else {
    LOG(`❌ FAIL (HTTP ${baseRes.statusCode} or empty content)\n`);
    console.log("   CRITICAL: Model might not exist, or API key is invalid.");
    process.exit(1);
  }

  await sleep(1500); // Prevent 429

  // 2. Strictness Test
  LOG("👉 2. Testing Strictness (Injecting dummy params)... ");
  const strictRes = await makeRequest("strictness", { prism_dummy: true });
  const isStrict = strictRes.statusCode !== 200 || !strictRes.validContent;
  if (isStrict) {
    LOG(`🛑 STRICT - Model rejects unknown params (Returned ${strictRes.statusCode} or null choices).\n`);
  } else {
    LOG("🌊 LENIENT - Model ignores unknown params.\n");
  }

  await sleep(1500); // Prevent 429

  let yieldsRootReasoning = false;
  let yieldsKwargsReasoning = false;
  let canTurnOffRoot = false;
  let canTurnOffKwargs = false;

  const hasInherentReasoning = baseRes.hasReasoning;

  if (!isStrict) {
    if (hasInherentReasoning) {
      // BASELINE IS ON: Test if we can turn it OFF
      LOG("👉 3. Testing Root 'enable_thinking: false'... ");
      const rootOffRes = await makeRequest("root_off", { enable_thinking: false });
      if (rootOffRes.statusCode === 200 && rootOffRes.validContent) {
        canTurnOffRoot = !rootOffRes.hasReasoning;
        LOG(`✅ ACCEPTED (Successfully turned off? ${canTurnOffRoot ? 'YES 🛑' : 'NO'})\n`);
      } else {
        LOG(`❌ REJECTED (HTTP ${rootOffRes.statusCode} - ValidContent: ${rootOffRes.validContent})\n`);
      }
      await sleep(1500);

      LOG("👉 4. Testing 'chat_template_kwargs.thinking: false'... ");
      const kwargsOffRes = await makeRequest("kwargs_off", { chat_template_kwargs: { thinking: false } });
      if (kwargsOffRes.statusCode === 200 && kwargsOffRes.validContent) {
        canTurnOffKwargs = !kwargsOffRes.hasReasoning;
        LOG(`✅ ACCEPTED (Successfully turned off? ${canTurnOffKwargs ? 'YES 🛑' : 'NO'})\n`);
      } else {
        LOG(`❌ REJECTED (HTTP ${kwargsOffRes.statusCode} - ValidContent: ${kwargsOffRes.validContent})\n`);
      }

    } else {
      // BASELINE IS OFF: Test if we can turn it ON
      LOG("👉 3. Testing Root 'enable_thinking: true'... ");
      const rootThinkRes = await makeRequest("root_thinking", { enable_thinking: true });
      if (rootThinkRes.statusCode === 200 && rootThinkRes.validContent) {
        yieldsRootReasoning = rootThinkRes.hasReasoning;
        LOG(`✅ ACCEPTED (Yields reasoning: ${yieldsRootReasoning ? 'YES 🧠' : 'NO'})\n`);
      } else {
        LOG(`❌ REJECTED\n`);
      }
      await sleep(1500);

      LOG("👉 4. Testing 'chat_template_kwargs.thinking: true'... ");
      const kwargsThinkRes = await makeRequest("kwargs_thinking", { chat_template_kwargs: { thinking: true } });
      if (kwargsThinkRes.statusCode === 200 && kwargsThinkRes.validContent) {
        yieldsKwargsReasoning = kwargsThinkRes.hasReasoning;
        LOG(`✅ ACCEPTED (Yields reasoning: ${yieldsKwargsReasoning ? 'YES 🧠' : 'NO'})\n`);
      } else {
        LOG(`❌ REJECTED\n`);
      }
    }
  } else {
    LOG("👉 3. Testing Root param... ⏭️ SKIPPED (Model is strict)\n");
    LOG("👉 4. Testing Kwargs param... ⏭️ SKIPPED (Model is strict)\n");
  }

  // --- ANALYSIS & GENERATION ---
  console.log("\n📊 [ANALYSIS REPORT]");
  
  let strategy = 'none';
  let reasoningNotes = 'Does not support reasoning or requires unknown parameters.';
  let supportsToggle = false;

  if (hasInherentReasoning && isStrict) {
      strategy = 'native_always_on';
      reasoningNotes = 'Natively supports reasoning. Model is STRICT, do NOT inject params. Cannot turn off.';
  } else if (hasInherentReasoning && !isStrict) {
      if (canTurnOffRoot) {
         strategy = 'root_boolean';
         supportsToggle = true;
         reasoningNotes = 'Reasoning ON by default. Can be toggled OFF via `enable_thinking`.';
      } else if (canTurnOffKwargs) {
         strategy = 'kwargs_dict';
         supportsToggle = true;
         reasoningNotes = 'Reasoning ON by default. Can be toggled OFF via `chat_template_kwargs`.';
      } else {
         strategy = 'native_always_on'; // It accepts params, but they don't do anything to stop the thinking
         reasoningNotes = 'Reasoning ON by default. Params accepted but cannot turn it off. Treat as always on.';
      }
  } else if (!hasInherentReasoning) {
      if (yieldsRootReasoning) {
        strategy = 'root_boolean';
        supportsToggle = true;
        reasoningNotes = 'Uses top-level `enable_thinking` to turn ON.';
      } else if (yieldsKwargsReasoning) {
        strategy = 'kwargs_dict';
        supportsToggle = true;
        reasoningNotes = 'Uses `chat_template_kwargs` to turn ON.';
      }
  }

  console.log(`- Strict Mode: ${isStrict ? 'Yes (Requires exact params)' : 'No (Forgiving)'}`);
  console.log(`- Reasoning Detected: ${hasInherentReasoning || yieldsRootReasoning || yieldsKwargsReasoning ? 'Yes 🧠' : 'No'}`);
  console.log(`- Prism Strategy: '${strategy}' (${reasoningNotes})`);

  console.log("\n🚀 [RECOMMENDED CONFIG FOR lib/models.ts]\n");
  
  const shortName = MODEL_ID.split('/').pop();
  const provider = MODEL_ID.split('/')[0];

  const configSnippet = `  {
    key: '${shortName.toLowerCase()}',
    name: '${shortName.replace(/-/g, ' ')}',
    provider: '${provider}',
    isIdSwitch: false,
    instruct: { id: '${MODEL_ID}', strategy: 'none' },${
      (strategy !== 'none' || hasInherentReasoning) ? `\n    thinking: { id: '${MODEL_ID}', strategy: '${strategy}' }` : ''
    }
  }`;

  console.log(configSnippet);
  if (strategy !== 'none') {
    console.log("\nIf you want to map strategy, add to MODEL_STRATEGIES:");
    console.log(`  '${MODEL_ID}': '${strategy}',\n`);
  }
}

runProbe().catch(console.error);