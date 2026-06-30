import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_ordermessage'),
    ]

    operations = [
        migrations.CreateModel(
            name='SupportMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('text', models.TextField(verbose_name='Текст')),
                ('is_read', models.BooleanField(default=False, verbose_name='Прочитано')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sent_support_messages', to='accounts.useraccounts', verbose_name='Отправитель')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='support_thread', to='accounts.useraccounts', verbose_name='Пользователь (тред)')),
            ],
            options={
                'verbose_name': 'Сообщение поддержки',
                'verbose_name_plural': 'Сообщения поддержки',
                'ordering': ['created_at'],
            },
        ),
    ]
