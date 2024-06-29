import React, {memo} from 'react'
import Query from './Query'
import Sources from './Sources';
import VectorCreation from './VectorCreation';
import GPT from './GPT';
import FollowUp from './FollowUp';

export type MessagePayload = {
    payload: {
        type: string;
        content: string | { title: string; link: string }[];
    }
    [id: string]: any;
  };

export interface MessageHandlerProps {
    message: MessagePayload;
    sendMessage: (messageToSend?: MessagePayload) => void;
}

const MessageHandler:React.FC<MessageHandlerProps> = memo(({message, sendMessage}) => {
    const COMPONENT_MAP: { [key: string]: React.ComponentType<any> } = {
        Query,
        Sources,
        VectorCreation,
        GPT,
        FollowUp,
      };

      const Component = COMPONENT_MAP[message.payload.type];

      return Component ? <Component content={message.payload.content} sendMessage={sendMessage} /> : null;
});

export default MessageHandler
