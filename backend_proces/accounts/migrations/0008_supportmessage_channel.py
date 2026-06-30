from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0007_supportmessage_telegram_message_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='supportmessage',
            name='channel',
            field=models.CharField(
                choices=[('site', 'Сайт'), ('telegram', 'Telegram')],
                default='site',
                max_length=10,
                verbose_name='Канал',
            ),
        ),
    ]
