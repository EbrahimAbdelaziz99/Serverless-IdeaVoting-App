import { APIGatewayProxyEvent } from 'aws-lambda';
import { formatJSONResponse } from '@libs/APIResponses';
import Dynamo from '@libs/Dynamo';
import { BoardRecord, IdeaRecord, VoteRecord } from 'src/types/dynamo';

export const handler = async (event: APIGatewayProxyEvent) => {
  try {
    const { boardId } = event.pathParameters;
    const tableName = process.env.singleTable;

    const board = await Dynamo.get<BoardRecord>({
      tableName,
      pkValue: boardId,
    });

    if (!board) {
      return formatJSONResponse({
        statusCode: 400,
        body: { message: 'no board found with that id' },
      });
    }

    const { pk, sk, ...responseData } = board;

    const ideas = await Dynamo.query<IdeaRecord>({
      tableName,
      index: 'index1',
      pkValue: `idea-${boardId}`,
      pkKey: 'pk',
    });

    const ideaDataPromiseArray = ideas.map(async ({ pk, sk, boardId, ...ideaData }) => {
      
      const votes = await Dynamo.query<VoteRecord>({
        tableName,
        index:'index1',
        pkKey:'pk',
        pkValue:`vote-${ideaData.id}`
      });

      return { 
        ...ideaData,
        votes:votes.length,
      }
    });

    const ideaDataArray = (await Promise.all(ideaDataPromiseArray)).sort(
      (a,b) => b.votes -b.votes
    );

    return formatJSONResponse({
      body: {
        ...responseData,
        ideas: ideaDataArray,
      },
    });
  } catch (error) {
    return formatJSONResponse({ statusCode: 500, body: error.message });
  }
};
