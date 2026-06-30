from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0006_supportmessage'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportmessage',
            name='telegram_message_id',
            field=models.BigIntegerField(blank=True, null=True, verbose_name='ID сообщения в Telegram'),
        ),
    ]
