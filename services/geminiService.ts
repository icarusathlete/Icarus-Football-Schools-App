
import { GoogleGenAI } from "@google/genai";
import { Player, AttendanceRecord, Match } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });

export const GeminiService = {
  analyzeAttendance: async (players: Player[], attendance: AttendanceRecord[], academyName: string = "Academy Portal") => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return "<p>Gemini API Key is missing.</p>";

    const summaryData = players.map(p => {
        const records = attendance.filter(a => a.playerId === p.id);
        const present = records.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
        
        return {
            name: p.fullName,
            stats: { total: records.length, present },
        };
    });

    const prompt = `
      Analyze this attendance data for "${academyName}": ${JSON.stringify(summaryData)}
      Provide a professional HTML summary.
    `;

    try {
      const result = await ai.models.generateContent({
        model: 'gemini-1.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      return result.text || "<p>No summary generated.</p>";
    } catch (error) {
      console.error("Gemini Error:", error);
      return "<p>Attendance analysis failed.</p>";
    }
  },

  generateReportCard: async (player: Player, attendance: AttendanceRecord[], matches: Match[]) => {
     if (!import.meta.env.VITE_GEMINI_API_KEY) return "<p class='text-white/40 italic text-sm'>AI insights currently offline...</p>";

     const playerMatches = matches.filter(m => m.playerStats.some(s => s.playerId === player.id));
     const totalGoals = playerMatches.reduce((sum, m) => sum + (m.playerStats.find(s => s.playerId === player.id)?.goals || 0), 0);
     const avgRating = playerMatches.length 
        ? (playerMatches.reduce((sum, m) => sum + (m.playerStats.find(s => s.playerId === player.id)?.rating || 0), 0) / playerMatches.length).toFixed(1)
        : 'N/A';
     
     const presence = attendance.filter(a => a.status === 'PRESENT' || a.status === 'LATE').length;
     const totalSessions = attendance.length;
     const attendanceRate = totalSessions ? Math.round((presence / totalSessions) * 100) : 0;

     const context = {
         name: player.fullName,
         position: player.position,
         attendanceRate: `${attendanceRate}%`,
         matchesPlayed: playerMatches.length,
         goals: totalGoals,
         averageRating: avgRating,
         metrics: player.evaluation?.metrics,
         timeTrials: player.evaluation?.timeTrials,
         overallRating: player.evaluation?.overallRating
     };

     const prompt = `
        As a Senior Technical Director for an Elite Global Football Group (e.g., City Football Group, Barcelona, or Ajax), 
        generate a high-level "Scouting Verdict" for student athlete ${player.fullName}.
        
        DATA CONTEXT:
        - Position: ${context.position}
        - Performance Index: ${context.overallRating}/100
        - Technical Profile: ${JSON.stringify(context.metrics)}
        - Physical Output: ${JSON.stringify(context.timeTrials)}
        - Participation: ${context.attendanceRate} Attendance
        - Competitive Stats: ${context.matchesPlayed} Match involvements, ${context.goals} Goal contributions, ${context.averageRating} Performance floor
        
        REQUIREMENTS:
        - Tone: Professional, encouraging, objective, clear football academy coaching style.
        - Language: Use simple, professional football coaching terms (e.g., "positional awareness", "speed and agility", "technical skill", "decision making", "possession", "work rate"). Do NOT use complex or clinical jargon.
        - Content: Identify the player's playing style, areas of strength, and potential for growth.
        - Limit: Exactly 2 highly analytical sentences.
        
        STRUCTURE (HTML ONLY):
        <div class="space-y-6">
          <p class="text-white/90 text-[14px] leading-relaxed italic font-semibold tracking-tight">
            [High-level coaching summary of the player's style, strengths, and areas for improvement]
          </p>
          <div class="p-5 bg-brand-500/10 border border-brand-500/20 rounded-[2rem] relative overflow-hidden group">
            <div class="absolute top-0 left-0 w-2 h-full bg-brand-500 shadow-[0_0_20px_rgba(0,200,255,0.4)]"></div>
            <span class="text-brand-500 font-black text-[9px] uppercase tracking-[0.4em] block mb-3 italic">COACH'S DIRECTIVE</span>
            <p class="text-white font-black text-[12px] italic tracking-wide uppercase leading-tight">[One clear, actionable coaching tip for the player to work on to improve their game]</p>
          </div>
        </div>
        
        CRITICAL: Return ONLY the HTML code. No markdown blocks, no preamble, no "Here is the HTML".
     `;

     try {
        const result = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        let text = result.text || "";
        // Aggressive cleaning to ensure only HTML is returned
        text = text.replace(/```html/g, "").replace(/```/g, "").replace(/^HTML/i, "").trim();
        
        return text || "<p class='text-white/30 italic text-sm font-black tracking-widest'>SUMMARY_UNAVAILABLE</p>";
     } catch (error) {
        console.error("Gemini Error:", error);
        return "<p class='text-white/30 italic text-sm font-black tracking-widest'>SERVICE_OFFLINE</p>";
     }
  },

  analyzeMatchPerformance: async (player: Player, match: Match, academyName: string = "Academy Portal") => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return "<p>API Key missing.</p>";

    const stats = match.playerStats.find(s => s.playerId === player.id);
    if (!stats) return "<p>No stats found.</p>";

    const prompt = `
        Analyze match for ${player.fullName} vs ${match.opponent}.
        Stats: Rating ${stats.rating}, Goals ${stats.goals}, Assists ${stats.assists}.
        Provide a concise HTML analysis using clear coaching language.
    `;

    try {
        const result = await ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        let text = result.text || "";
        text = text.replace(/```html/g, "").replace(/```/g, "").trim();
        return text || "<p>No analysis generated.</p>";
    } catch (error) {
        return "<p>Analysis unavailable.</p>";
    }
  },

  generateCoachVerdictSuggestion: async (player: Player, evaluationData: any): Promise<string[]> => {
    if (!import.meta.env.VITE_GEMINI_API_KEY) return ["AI Suggestion unavailable. Please input manual verdict."];

    const context = {
        name: player.fullName,
        position: player.position,
        metrics: evaluationData.metrics,
        timeTrials: evaluationData.timeTrials,
        overallRating: evaluationData.overallRating,
        developmentAreas: evaluationData.developmentAreas
    };

    const prompt = `
        As a Lead Coach for a Youth Football Academy, write 3 distinct coaching verdicts for ${player.fullName}.
        
        PERFORMANCE METRICS:
        - Overall Index: ${context.overallRating}/100
        - Technical Competencies: ${JSON.stringify(context.metrics)}
        - Biomechanical Output: ${JSON.stringify(context.timeTrials)}
        - Development Focus Areas: ${context.developmentAreas.join(', ')}
        
        REQUIREMENTS:
        - Tone: Professional, constructive, clear football coaching style.
        - Terminology: Use simple, standard youth coaching terms (e.g., "spatial awareness", "dribbling ability", "work rate", "decision making under pressure", "passing range"). Do NOT use complex jargon.
        - Content: Each variation should emphasize a different coaching perspective:
            1. PLAYING STYLE: Define the player's role and style (e.g., "Creative Playmaker", "Solid Defender", "Clinical Finisher").
            2. STRENGTHS AND POTENTIAL: Analyze current skills and future potential.
            3. STRATEGIC GROWTH: Connect the development focus areas to how they can improve on match days.
        - Constraint: Exactly 2-3 highly professional scouting sentences per variation.
        
        OUTPUT FORMAT:
        Return a JSON object with a "suggestions" key containing an array of 3 strings.
        Example: {"suggestions": ["...", "...", "..."]}
        Return ONLY the JSON.
    `;

    try {
        const result = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const text = result.text?.trim() || "";
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        
        try {
            const parsed = JSON.parse(cleanedText);
            if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
                return parsed.suggestions;
            }
        } catch (e) {
            console.error("Failed to parse AI response as JSON", cleanedText);
            return [text || "Awaiting verdict..."];
        }
        
        return ["Awaiting verdict..."];
    } catch (error) {
        console.error("Gemini Error:", error);
        return ["System offline. Please input manual verdict."];
    }
  }
};

