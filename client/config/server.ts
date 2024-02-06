import ip from 'ip';

const { env } = process;

export default {
    host: env.Host || ip.address(),
    port: env.Port ? parseInt(env.Port, 10) : 9200,
    database: env.Database || 'mongodb://localhost:27017/fiora',
    redis: {
        host: env.RedisHost || 'localhost',
        port: env.RedisPort ? parseInt(env.RedisPort, 10) : 6379,
    },
    jwtSecret: env.JwtSecret || 'jwtSecret',
    maxGroupsCount: env.MaxGroupCount ? parseInt(env.MaxGroupCount, 10) : 3,

    allowOrigin: env.AllowOrigin ? env.AllowOrigin.split(',') : null,
    tokenExpiresTime: env.TokenExpiresTime
        ? parseInt(env.TokenExpiresTime, 10)
        : 1000 * 60 * 60 * 24 * 30,
    administrator: env.Administrator ? env.Administrator.split(',') : [],
    disableRegister: env.DisableRegister
        ? env.DisableRegister === 'true'
        : false,
    disableCreateGroup: env.DisableCreateGroup
        ? env.DisableCreateGroup === 'true'
        : false,
    aliyunOSS: {
        enable: env.ALIYUN_OSS ? env.ALIYUN_OSS === 'true' : false,
        accessKeyId: env.ACCESS_KEY_ID || '',
        accessKeySecret: env.ACCESS_KEY_SECRET || '',
        roleArn: env.ROLE_ARN || '',
        region: env.REGION || '',
        bucket: env.BUCKET || '',
        endpoint: env.ENDPOINT || '',
    },
};
