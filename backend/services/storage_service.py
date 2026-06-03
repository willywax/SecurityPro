"""Google Cloud Storage service for file uploads and signed URL generation."""

import os
import uuid
import logging
from datetime import timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import quote

logger = logging.getLogger(__name__)


class StorageService:
    """Manages file uploads, downloads, and signed URLs via GCS."""

    def __init__(self):
        self.bucket_name = os.getenv("GCS_BUCKET_NAME", "securitypro-media")
        self.cdn_base_url = (
            os.getenv("MEDIA_CDN_BASE_URL")
            or os.getenv("CDN_BASE_URL")
            or ""
        ).rstrip("/")
        self._client = None
        self._credentials = None
        self._use_key_signing = False
        self._available = False
        self._init_client()

    def _init_client(self):
        """Initialize GCS client. Supports key file (local) and Workload Identity (Cloud Run)."""
        try:
            from google.cloud import storage

            creds_file = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "./gcs-key.json")

            if os.path.exists(creds_file):
                # Local dev: use service account key file
                from google.oauth2 import service_account
                self._credentials = service_account.Credentials.from_service_account_file(
                    creds_file,
                    scopes=["https://www.googleapis.com/auth/cloud-platform"],
                )
                self._client = storage.Client(credentials=self._credentials)
                self._use_key_signing = True
                logger.info("GCS: initialized with service account key file")
            else:
                # Cloud Run / Workload Identity: Application Default Credentials
                self._client = storage.Client()
                self._use_key_signing = False
                logger.info("GCS: initialized with Application Default Credentials (Workload Identity)")

            self._available = True

        except ImportError:
            logger.warning("google-cloud-storage not installed — GCS unavailable")
        except Exception as exc:
            logger.error(f"GCS init failed: {exc}")

    def _is_available(self) -> bool:
        if not self._available or self._client is None:
            raise RuntimeError(
                "Google Cloud Storage is not configured. "
                "Set GCS_BUCKET_NAME and GOOGLE_APPLICATION_CREDENTIALS or use Workload Identity."
            )
        return True

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def upload_file(
        self,
        file_bytes: bytes,
        folder: str,
        entity_id: str,
        original_filename: str,
        content_type: str = "application/octet-stream",
        cache_control: Optional[str] = None,
    ) -> str:
        """
        Upload bytes to GCS.

        Returns the GCS object path (e.g. 'employees/photos/<id>/abc123.jpg').
        Never returns a public URL.
        """
        self._is_available()

        ext = Path(original_filename).suffix.lower()
        unique_name = f"{uuid.uuid4()}{ext}"
        gcs_path = f"{folder.rstrip('/')}/{entity_id}/{unique_name}"

        bucket = self._client.bucket(self.bucket_name)
        blob = bucket.blob(gcs_path)
        if cache_control:
            blob.cache_control = cache_control
        blob.upload_from_string(file_bytes, content_type=content_type)

        logger.info(f"GCS upload: gs://{self.bucket_name}/{gcs_path}")
        return gcs_path

    def get_public_url(self, gcs_path: str) -> Optional[str]:
        """Return the CDN/public URL for a GCS path when a CDN base URL is configured."""
        if not self.cdn_base_url:
            return None
        return f"{self.cdn_base_url}/{gcs_path.lstrip('/')}"

    def get_direct_url(self, gcs_path: str) -> str:
        """Return the standard browser URL for a GCS object."""
        encoded_path = quote(gcs_path.lstrip("/"), safe="/")
        return f"https://storage.googleapis.com/{self.bucket_name}/{encoded_path}"

    def get_view_url(self, gcs_path: str, expiry_minutes: int = 60) -> str:
        """Return the best browser-viewable URL for a GCS object."""
        public_url = self.get_public_url(gcs_path)
        if public_url:
            return public_url

        try:
            return self.get_signed_url(gcs_path, expiry_minutes=expiry_minutes)
        except Exception as exc:
            logger.warning(f"GCS signed URL failed for {gcs_path}; falling back to direct URL: {exc}")
            return self.get_direct_url(gcs_path)

    def get_signed_url(self, gcs_path: str, expiry_minutes: int = 60) -> str:
        """Generate a signed GET URL valid for `expiry_minutes`."""
        self._is_available()

        bucket = self._client.bucket(self.bucket_name)
        blob = bucket.blob(gcs_path)
        expiration = timedelta(minutes=expiry_minutes)

        if self._use_key_signing:
            # Local dev: sign with service account key
            return blob.generate_signed_url(
                expiration=expiration,
                method="GET",
                version="v4",
                credentials=self._credentials,
            )
        else:
            # Cloud Run: sign using ADC access token + service account email from metadata
            import google.auth
            import google.auth.transport.requests

            credentials, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
            request = google.auth.transport.requests.Request()
            credentials.refresh(request)

            service_account_email = getattr(credentials, "service_account_email", None)
            access_token = credentials.token

            return blob.generate_signed_url(
                expiration=expiration,
                method="GET",
                version="v4",
                service_account_email=service_account_email,
                access_token=access_token,
            )

    def get_download_url(self, gcs_path: str, original_filename: str, expiry_minutes: int = 60) -> str:
        """Signed URL that forces browser download with the original filename."""
        self._is_available()

        bucket = self._client.bucket(self.bucket_name)
        blob = bucket.blob(gcs_path)
        expiration = timedelta(minutes=expiry_minutes)

        disposition = f'attachment; filename="{original_filename}"'

        if self._use_key_signing:
            return blob.generate_signed_url(
                expiration=expiration,
                method="GET",
                version="v4",
                credentials=self._credentials,
                response_disposition=disposition,
            )
        else:
            import google.auth
            import google.auth.transport.requests

            credentials, _ = google.auth.default(
                scopes=["https://www.googleapis.com/auth/cloud-platform"]
            )
            request = google.auth.transport.requests.Request()
            credentials.refresh(request)

            return blob.generate_signed_url(
                expiration=expiration,
                method="GET",
                version="v4",
                service_account_email=getattr(credentials, "service_account_email", None),
                access_token=credentials.token,
                response_disposition=disposition,
            )

    def delete_file(self, gcs_path: str) -> bool:
        """Delete a file from GCS. Returns True on success."""
        try:
            self._is_available()
            bucket = self._client.bucket(self.bucket_name)
            blob = bucket.blob(gcs_path)
            blob.delete()
            logger.info(f"GCS delete: gs://{self.bucket_name}/{gcs_path}")
            return True
        except Exception as exc:
            logger.warning(f"GCS delete failed for {gcs_path}: {exc}")
            return False


# Module-level singleton
storage_service = StorageService()
