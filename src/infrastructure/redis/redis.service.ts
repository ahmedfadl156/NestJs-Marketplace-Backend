import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService {
    private readonly client: RedisClientType;

    constructor(private readonly configService: ConfigService){
        // هنا بننشئ كلاينت من ريديس علشان نتصل بيه
        this.client = createClient({
            url: this.configService.getOrThrow<string>('REDIS_URL')
        })
        
        this.client.on('error' , (error) => {
            console.error(error);
        })
    }

    async onModuleInit(): Promise<void> {
        await this.client.connect();
    }

    async onModuleDestroy(): Promise<void> {
        await this.client.quit();
    }

    getClient(): RedisClientType {
        return this.client;
    }
}
