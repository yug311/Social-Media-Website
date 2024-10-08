# Generated by Django 5.0.1 on 2024-02-09 05:31

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('network', '0021_remove_image_post'),
    ]

    operations = [
        migrations.AddField(
            model_name='image',
            name='comment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='images', to='network.comment'),
        ),
        migrations.AddField(
            model_name='image',
            name='post',
            field=models.ForeignKey(default=1, on_delete=django.db.models.deletion.CASCADE, related_name='images', to='network.post'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='image',
            name='image',
            field=models.ImageField(upload_to='post_images'),
        ),
    ]
