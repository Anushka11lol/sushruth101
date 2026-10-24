import torch
import torch.nn as nn


class Encoder(nn.Module):
    """
    Deeper CNN Encoder: 256x256x3 → 32x32x64
    Compression ratio: (3*256*256) / (64*32*32) = 3x (float32)
    More channels = less information lost = higher reconstruction accuracy.
    """
    def __init__(self, latent_channels: int = 64):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(3,   64,  kernel_size=3, stride=1, padding=1),   # 256x256x64
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64,  64,  kernel_size=3, stride=2, padding=1),   # 128x128x64
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64,  128, kernel_size=3, stride=1, padding=1),   # 128x128x128
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, kernel_size=3, stride=2, padding=1),   # 64x64x128
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, latent_channels, kernel_size=3, stride=2, padding=1),  # 32x32xC
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.conv(x)


class Decoder(nn.Module):
    """
    Deeper CNN Decoder: 32x32x64 → 256x256x3
    """
    def __init__(self, latent_channels: int = 64):
        super().__init__()
        self.deconv = nn.Sequential(
            nn.ConvTranspose2d(latent_channels, 128, kernel_size=3, stride=2, padding=1, output_padding=1),  # 64x64x128
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.Conv2d(128, 128, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(128, 64, kernel_size=3, stride=2, padding=1, output_padding=1),               # 128x128x64
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Conv2d(64, 64, kernel_size=3, stride=1, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.ConvTranspose2d(64, 3, kernel_size=3, stride=2, padding=1, output_padding=1),                 # 256x256x3
            nn.Sigmoid(),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.deconv(x)


class Autoencoder(nn.Module):
    def __init__(self, latent_channels: int = 64):
        super().__init__()
        self.encoder = Encoder(latent_channels)
        self.decoder = Decoder(latent_channels)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        z = self.encoder(x)
        x_hat = self.decoder(z)
        return x_hat, z
