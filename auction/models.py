from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    color = models.CharField(max_length=20, default="#3B82F6")
    player_limit = models.IntegerField(default=6)
    display_order = models.IntegerField(default=0)

    def __str__(self):
        return self.name

class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    logo = models.CharField(max_length=255, blank=True, null=True)
    color = models.CharField(max_length=20, default="#10B981")
    coins = models.IntegerField(default=5000)
    starting_coins = models.IntegerField(default=5000)
    captain = models.CharField(max_length=100, blank=True, null=True)
    coach = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name

class Player(models.Model):
    name = models.CharField(max_length=100)
    photo = models.CharField(max_length=255, blank=True, null=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name="players")
    base_price = models.IntegerField(default=100)
    sold_price = models.IntegerField(default=0, null=True, blank=True)
    sold_to = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="squad")
    status = models.CharField(max_length=20, default="Upcoming") # Upcoming, Live, Sold, Unsold
    ranking = models.IntegerField(default=0, null=True, blank=True)
    seed = models.IntegerField(default=0, null=True, blank=True)
    auction_order = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.name} ({self.status})"

class AuctionSettings(models.Model):
    # Tournament setup settings
    auction_name = models.CharField(max_length=150, default="BASCH")
    tournament_name = models.CharField(max_length=150, default="Team Pickleball Championship 2026")
    sport_name = models.CharField(max_length=100, default="Pickleball")
    starting_coins = models.IntegerField(default=5000)
    timer = models.IntegerField(default=30)
    bid_increments = models.CharField(max_length=100, default="10,20,50,100")
    currency_name = models.CharField(max_length=50, default="Coins")
    currency_icon = models.CharField(max_length=20, default="💰")

    # Consolidated live auction state
    current_category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    current_player = models.ForeignKey(Player, on_delete=models.SET_NULL, null=True, blank=True, related_name="current_in_auction")
    highest_bid = models.IntegerField(default=0)
    highest_bidder = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name="leading_bids")
    timer_remaining = models.IntegerField(default=30)
    auction_status = models.CharField(max_length=20, default="READY") # READY, LIVE, PAUSED, COMPLETED

    def __str__(self):
        return f"{self.auction_name} - {self.auction_status}"

class BidHistory(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name="bids")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="bids_placed")
    amount = models.IntegerField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.team.name} bid {self.amount} on {self.player.name}"
