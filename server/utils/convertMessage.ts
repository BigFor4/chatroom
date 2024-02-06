function convertSystemMessage(message: any) {
    if (message.type === 'system') {
        message.from._id = 'system';
        message.from.originUsername = message.from.username;
        message.from.username = 'Lady Octopus';
        message.from.tag = 'system';

        const content = JSON.parse(message.content);
        switch (content.command) {
            case 'roll': {
                message.content = `has thrown out ${content.value}points (upper limit${content.top} points)`;
                break;
            }
            case 'rps': {
                message.content = `used ${content.value}`;
                break;
            }
            default: {
                message.content = 'Unsupported command';
            }
        }
    } else if (message.deleted) {
        message.type = 'system';
        message.from._id = 'system';
        message.from.originUsername = message.from.username;
        message.from.username = 'lady octopus';
        message.from.tag = 'system';
        message.content = `retracted the message`;
    }
}

export default function convertMessage(message: any) {
    convertSystemMessage(message);
    return message;
}
