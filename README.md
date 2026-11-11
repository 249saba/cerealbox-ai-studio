# CerealBox AI Studio — Gemini integration

This update preserves the original React/Vite UI and campaign features and replaces mock Idea Generator and AI Copywriter responses with real Google Gemini API calls.

## Windows setup (PowerShell / VS Code)
1. Install Node.js 20+ and check `node -v` and `npm -v`.
2. Unzip this project. Open its folder in VS Code.
3. Create `server/.env` by copying `server/.env.example`.
4. Create a Gemini API key at https://aistudio.google.com/api-keys and replace `PASTE_YOUR_GEMINI_API_KEY_HERE` in **server/.env**. Do not share or commit your key.
5. Open a VS Code terminal at the project root and run:

```powershell
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

6. Visit http://localhost:5173 and check that the top right shows **GEMINI AI MODE**.
7. Fill out Idea Generator or AI Copywriter and click Generate. The output heading shows the Gemini model used.

## Verify API is configured
Visit http://localhost:5000/api/health. Expected: `"aiMode":"gemini"`.
This confirms a key is configured, **not** that Google has accepted it. To verify a real response, successfully generate ideas or copy: the backend only returns `mode: "gemini"` after the SDK has returned a valid response. No mock fallback exists.

## Troubleshooting
- **GEMINI NOT CONFIGURED**: Create `server/.env`, set `GEMINI_API_KEY`, and restart `npm run dev`.
- **429 quota/rate limit**: Wait or review your Google AI Studio quota and billing.
- **Invalid API key**: Check the key, project permissions, and any API key restrictions.
- **Model unavailable**: Check `GEMINI_MODEL` in `server/.env` against your account's available models.
- **Backend unavailable**: Check port 5000 and terminal errors; frontend uses port 5173.
- **Retry**: Failed generation shows an error banner with a Retry button.

## Endpoints
- `GET /api/health`
- `GET /api/campaigns`
- `POST /api/campaigns`
- `POST /api/ai/ideas`
- `POST /api/ai/copy`

## Notes
- Real generation requires your own Google Gemini API key and available quota. We did not test against a live key.
- Campaigns remain in memory and reset on server restart.
- The app is a local prototype; do not connect to live CerealBox accounts or ad systems.
- AI outputs need human review before publication.

## Connected workflow: Idea Generator → AI Copywriter

1. Open **Idea Generator**, complete the campaign brief, and generate five ideas.
2. Click **Use This Idea** on the concept you prefer.
3. The app switches to **AI Copywriter** and fills the campaign name, target audience, offer, and creative direction. The idea's title, angle, description, hook, and format are preserved in the editable **Selected campaign idea** field.
4. Review or edit the fields, select platform/tone, and click **Generate ad copy**.
5. Gemini uses the selected creative direction to write the ad. Review the output before publishing.
6. To try another concept, return to **Idea Generator** and select another **Use This Idea** button. To generate without a concept, click **Clear idea** in Copywriter.

If generation fails, the existing error notice offers **Retry**. Your selected idea remains in the form. The app does not silently switch to mock content.

### Windows setup (PowerShell)

Extract the ZIP, open the `cerealbox-ai-studio` folder in VS Code, and run:

```powershell
npm install
npm --prefix server install
npm --prefix client install
Copy-Item server/.env.example server/.env
```

Add your own Gemini API key to `server/.env` (`GEMINI_API_KEY=...`), then run `npm run dev` from the project root. Visit http://localhost:5173 and check http://localhost:5000/api/health. Never share your API key or commit `.env` to source control. If your existing `server/.env` is already configured, **keep it** when replacing the project files; do not overwrite it with `.env.example`.


## Static Creative (Gemini image generation)
- In AI Copywriter, generate copy and click **Create static creative from this copy**.
- Or open **Static Creative** and enter the brief manually.
- Click **Generate static creative** and wait (image requests may take 1–2 minutes).
- Review the image and click **Download image**. Regenerate if needed.
- Set `GEMINI_IMAGE_MODEL=gemini-2.5-flash-image` in `server/.env`. Your Gemini API key must have image-generation model access; quota/billing may differ from text models. If you receive model-not-found or quota errors, verify availability in Google AI Studio.
- Images are sent as base64 in the API response and kept only in browser memory, not saved to campaigns or a database.
- Campaigns page lists ONLY campaigns created through **New campaign**. Generated ideas, copy and images are not automatically saved as campaigns. The backend keeps campaigns in memory, so restarting it clears the list.
- Never publish generated creative without checking accuracy, consent, branding and ad platform rules.
