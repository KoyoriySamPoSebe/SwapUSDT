from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import UntypedToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model



class CustomJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            return None

        if isinstance(header, bytes):
            header = header.decode('utf-8')

        if not header.startswith('Bearer '):
            raw_token = header
        else:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)

        return self.get_user(validated_token), validated_token

    def get_raw_token(self, header):
        """
        Extracts the raw token from the header. Supports tokens without 'Bearer'.
        """
        if header.startswith('Bearer '):
            return header.split(' ')[1] 
        return header

