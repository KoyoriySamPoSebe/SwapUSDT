import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_order_client_name'),
    ]

    operations = [
        migrations.CreateModel(
            name='OrderMessage',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('text', models.TextField(verbose_name='Текст сообщения')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Создано')),
                ('order', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='messages', to='accounts.order', verbose_name='Заявка')),
                ('sender', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='order_messages', to='accounts.useraccounts', verbose_name='Отправитель')),
            ],
            options={
                'verbose_name': 'Сообщение заявки',
                'verbose_name_plural': 'Сообщения заявок',
                'ordering': ['created_at'],
            },
        ),
    ]
