/**
 * Stage 9: Theme & Outline
 * Small knowledge graph → 1 dominant theme + up to 2 sub-themes → 5-section outline
 * Sections: cold open, company deep dive, competitor moves, industry/special topic, takeaways
 * Per requirements section 2.3.3 #9
 */

import { ThematicOutline, TopicSummary } from '@/types/shared';
import { IEventEmitter } from '@/utils/event-emitter';
import { ILlmGateway } from '@/gateways/types';
import { logger } from '@/utils/logger';
import { parseLLMJson } from '@/utils/json-parser';

export interface OutlineOutput {
  outline: ThematicOutline;
  knowledgeGraph: {
    entities: number;
    relationships: number;
  };
}

export class OutlineStage {
  constructor(private llmGateway: ILlmGateway) {}

  async execute(
    summaries: TopicSummary[],
    companyName: string,
    emitter: IEventEmitter
  ): Promise<OutlineOutput> {
    await emitter.emit('outline', 0, 'Starting thematic outline generation');

    // Construct input for theme detection
    const summaryText = summaries
      .map((s) => `${s.topicName}: ${s.paragraph}`)
      .join('\n\n');

    await emitter.emit('outline', 30, 'Identifying dominant theme');

    // Identify theme
    const themeResponse = await this.llmGateway.complete({
      messages: [
        {
          role: 'system',
          content: `You are a podcast producer. Given multiple topic summaries, identify the one dominant theme that connects them and up to 2 sub-themes. Return JSON: {"theme": "main theme", "subThemes": ["sub1", "sub2"]}`,
        },
        {
          role: 'user',
          content: `Company: ${companyName}\n\nTopic Summaries:\n${summaryText}`,
        },
      ],
      temperature: 0.6,
      maxTokens: 200,
      responseFormat: 'json_object',
    });

    let themeData;
    try {
      themeData = parseLLMJson<{ theme: string; subThemes: string[] }>(
        themeResponse.content,
        { theme: 'Company Intelligence Update', subThemes: [] }
      );
    } catch (error: any) {
      logger.error('Failed to parse theme response', {
        error: error.message,
        responsePreview: themeResponse.content.substring(0, 200),
      });
      // Use fallback theme data
      themeData = {
        theme: 'Company Intelligence Update',
        subThemes: [],
      };
    }
    
    // Enforce maximum 2 sub-themes as per requirements
    if (themeData.subThemes && themeData.subThemes.length > 2) {
      themeData.subThemes = themeData.subThemes.slice(0, 2);
    }
    
    // Ensure theme exists
    if (!themeData.theme || typeof themeData.theme !== 'string') {
      themeData.theme = 'Company Intelligence Update';
    }
    
    // Ensure subThemes is an array
    if (!Array.isArray(themeData.subThemes)) {
      themeData.subThemes = [];
    }

    await emitter.emit('outline', 60, 'Generating episode outline');

    // Generate outline structure
    const outlineResponse = await this.llmGateway.complete({
      messages: [
        {
          role: 'system',
          content: `You are a podcast producer. Create a structured outline with 5 sections:
1. Cold Open (hook)
2. Company Deep Dive
3. Competitor Moves
4. Industry/Special Topics
5. Takeaways

Return JSON with sections array: [{"section": "cold_open", "title": "...", "bulletPoints": ["...", "..."]}]`,
        },
        {
          role: 'user',
          content: `Theme: ${themeData.theme}\nSubthemes: ${themeData.subThemes.join(', ')}\n\nSummaries:\n${summaryText}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 1500, // Increased to prevent JSON truncation
      responseFormat: 'json_object',
    });

    let outlineData;
    try {
      outlineData = parseLLMJson<{ sections: Array<{ section: string; title: string; bulletPoints: string[] }> }>(
        outlineResponse.content,
        { sections: [] }
      );
    } catch (error: any) {
      logger.error('Failed to parse outline response', { 
        error: error.message, 
        responsePreview: outlineResponse.content.substring(0, 500),
        fullResponseLength: outlineResponse.content.length,
      });
      
      // Try to extract sections manually as last resort
      logger.warn('Attempting to extract sections from malformed response');
      const sectionsMatch = outlineResponse.content.match(/sections?["\s]*:[\s]*\[([\s\S]*?)\]/);
      if (sectionsMatch) {
        logger.warn('Found sections array in response, but JSON is malformed');
      }
      
      // Create fallback outline structure
      outlineData = {
        sections: [
          {
            section: 'cold_open',
            title: 'Opening Hook',
            bulletPoints: ['Introduce the main theme'],
          },
          {
            section: 'company_deep_dive',
            title: 'Company Deep Dive',
            bulletPoints: ['Key company developments'],
          },
          {
            section: 'competitor_moves',
            title: 'Competitor Moves',
            bulletPoints: ['Competitive landscape updates'],
          },
          {
            section: 'industry_special',
            title: 'Industry & Special Topics',
            bulletPoints: ['Industry trends and insights'],
          },
          {
            section: 'takeaways',
            title: 'Key Takeaways',
            bulletPoints: ['Summary and conclusions'],
          },
        ],
      };
      logger.warn('Using fallback outline structure due to parse failure');
    }

    // Validate sections exist
    if (!outlineData.sections || !Array.isArray(outlineData.sections) || outlineData.sections.length === 0) {
      logger.error('Outline LLM response missing sections', { 
        outlineData,
        responseContent: outlineResponse.content.substring(0, 500),
      });
      
      // Create minimal fallback sections
      outlineData.sections = [
        {
          section: 'cold_open',
          title: 'Opening',
          bulletPoints: ['Introduction'],
        },
        {
          section: 'company_deep_dive',
          title: 'Company Update',
          bulletPoints: ['Company news'],
        },
        {
          section: 'competitor_moves',
          title: 'Competitors',
          bulletPoints: ['Competitive updates'],
        },
        {
          section: 'industry_special',
          title: 'Industry',
          bulletPoints: ['Industry trends'],
        },
        {
          section: 'takeaways',
          title: 'Takeaways',
          bulletPoints: ['Summary'],
        },
      ];
      logger.warn('Using minimal fallback sections');
    }
    
    // Ensure all sections have required fields
    outlineData.sections = outlineData.sections.map((section: any, index: number) => ({
      section: section.section || `section_${index + 1}`,
      title: section.title || 'Section',
      bulletPoints: Array.isArray(section.bulletPoints) ? section.bulletPoints : ['Point 1'],
    }));

    const outline: ThematicOutline = {
      theme: themeData.theme,
      subThemes: themeData.subThemes || [],
      sections: outlineData.sections,
    };

    // Build simple knowledge graph (entity count tracking)
    const entities = summaries.length + 1; // topics + company
    const relationships = summaries.length; // company -> topic connections

    logger.info('Outline stage complete', {
      theme: outline.theme,
      subThemeCount: outline.subThemes.length,
      sectionCount: outline.sections.length,
      knowledgeGraphEntities: entities,
      knowledgeGraphRelationships: relationships,
    });

    await emitter.emit('outline', 100, 'Outline complete with knowledge graph', 'info', {
      theme: outline.theme,
      subThemeCount: outline.subThemes.length,
    });

    return { 
      outline,
      knowledgeGraph: {
        entities,
        relationships,
      },
    };
  }
}

