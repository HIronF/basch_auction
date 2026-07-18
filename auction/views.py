import json
import csv
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.db import transaction
from django.core.management import call_command
from .models import Category, Team, Player, AuctionSettings, BidHistory

def onboarding_view(request):
    return render(request, "onboarding.html")

def index_view(request):
    return render(request, "index.html")

def admin_view(request):
    return render(request, "admin.html")

def teams_view(request):
    return render(request, "teams.html")

def players_view(request):
    return render(request, "players.html")

def analytics_view(request):
    return render(request, "analytics.html")

def projector_view(request):
    return render(request, "projector.html")

def get_serialized_state():
    settings = AuctionSettings.objects.first()
    if not settings:
        settings = AuctionSettings.objects.create()

    # If current_player is None but there are upcoming players, set one
    if not settings.current_player:
        first_upcoming = Player.objects.filter(status="Upcoming").order_by("auction_order").first()
        if first_upcoming:
            first_upcoming.status = "Live"
            first_upcoming.save()
            settings.current_player = first_upcoming
            settings.current_category = first_upcoming.category
            settings.highest_bid = first_upcoming.base_price
            settings.highest_bidder = None
            settings.save()

    categories_qs = Category.objects.all().order_by("display_order")
    categories_data = [
        {
            "id": c.id,
            "name": c.name,
            "color": c.color,
            "player_limit": c.player_limit,
            "display_order": c.display_order,
            "sold_count": Player.objects.filter(category=c, status="Sold").count(),
            "total_count": Player.objects.filter(category=c).count()
        }
        for c in categories_qs
    ]

    teams_qs = Team.objects.all().order_by("id")
    teams_data = []
    for t in teams_qs:
        squad_qs = t.squad.all()
        # Compute category-wise slots remaining
        cat_slots = {}
        for c in categories_qs:
            bought_in_cat = squad_qs.filter(category=c).count()
            cat_slots[c.name] = max(0, c.player_limit - bought_in_cat)

        teams_data.append({
            "id": t.id,
            "name": t.name,
            "logo": t.logo,
            "color": t.color,
            "coins": t.coins,
            "starting_coins": t.starting_coins,
            "captain": t.captain,
            "coach": t.coach,
            "squad_count": squad_qs.count(),
            "money_spent": t.starting_coins - t.coins,
            "cat_slots": cat_slots,
            "squad": [
                {
                    "id": p.id,
                    "name": p.name,
                    "photo": p.photo,
                    "category_id": p.category.id if p.category else None,
                    "category_name": p.category.name if p.category else "",
                    "sold_price": p.sold_price
                }
                for p in squad_qs
            ]
        })

    players_qs = Player.objects.all().order_by("auction_order")
    players_data = [
        {
            "id": p.id,
            "name": p.name,
            "photo": p.photo,
            "category_id": p.category.id if p.category else None,
            "category_name": p.category.name if p.category else "Uncategorized",
            "base_price": p.base_price,
            "sold_price": p.sold_price,
            "sold_to_id": p.sold_to.id if p.sold_to else None,
            "sold_to_name": p.sold_to.name if p.sold_to else "",
            "status": p.status,
            "ranking": p.ranking,
            "seed": p.seed,
            "auction_order": p.auction_order
        }
        for p in players_qs
    ]

    bid_history_qs = BidHistory.objects.filter(player=settings.current_player).order_by("-id")[:30] if settings.current_player else []
    bid_history_data = [
        {
            "id": bh.id,
            "player_id": bh.player.id,
            "team_id": bh.team.id,
            "team_name": bh.team.name,
            "team_color": bh.team.color,
            "amount": bh.amount,
            "timestamp": bh.timestamp.strftime("%H:%M:%S")
        }
        for bh in bid_history_qs
    ]

    total_players = players_qs.count()
    players_sold = players_qs.filter(status="Sold").count()
    players_remaining = players_qs.filter(status__in=["Upcoming", "Live"]).count()
    total_spent = sum(p.sold_price or 0 for p in players_qs.filter(status="Sold"))
    richest_team_obj = teams_qs.order_by("-coins").first()
    most_expensive_obj = players_qs.filter(status="Sold").order_by("-sold_price").first()

    statistics = {
        "total_players": total_players,
        "players_sold": players_sold,
        "players_remaining": players_remaining,
        "total_coins_circulated": sum(t.starting_coins for t in teams_qs),
        "total_coins_spent": total_spent,
        "richest_team": richest_team_obj.name if richest_team_obj else "-",
        "richest_team_coins": richest_team_obj.coins if richest_team_obj else 0,
        "most_expensive_player": most_expensive_obj.name if most_expensive_obj else "-",
        "most_expensive_price": most_expensive_obj.sold_price if most_expensive_obj else 0
    }

    settings_data = {
        "id": settings.id,
        "auction_name": settings.auction_name,
        "tournament_name": settings.tournament_name,
        "sport_name": settings.sport_name,
        "starting_coins": settings.starting_coins,
        "timer": settings.timer,
        "bid_increments": [int(x.strip()) for x in settings.bid_increments.split(",") if x.strip().isdigit()],
        "currency_name": settings.currency_name,
        "currency_icon": settings.currency_icon,
        "current_category_id": settings.current_category.id if settings.current_category else None,
        "current_player_id": settings.current_player.id if settings.current_player else None,
        "highest_bid": settings.highest_bid,
        "highest_bidder_id": settings.highest_bidder.id if settings.highest_bidder else None,
        "highest_bidder_name": settings.highest_bidder.name if settings.highest_bidder else "",
        "timer_remaining": settings.timer_remaining,
        "auction_status": settings.auction_status
    }

    return {
        "settings": settings_data,
        "categories": categories_data,
        "teams": teams_data,
        "players": players_data,
        "bid_history": bid_history_data,
        "statistics": statistics
    }

@csrf_exempt
def get_state(request):
    return JsonResponse(get_serialized_state())

@csrf_exempt
@require_http_methods(["POST"])
def start_auction(request):
    settings = AuctionSettings.objects.first()
    if settings:
        settings.auction_status = "LIVE"
        settings.save()
    return JsonResponse(get_serialized_state())

@csrf_exempt
@require_http_methods(["POST"])
def pause_auction(request):
    settings = AuctionSettings.objects.first()
    if settings:
        settings.auction_status = "PAUSED"
        settings.save()
    return JsonResponse(get_serialized_state())

@csrf_exempt
@require_http_methods(["POST"])
def resume_auction(request):
    settings = AuctionSettings.objects.first()
    if settings:
        settings.auction_status = "LIVE"
        settings.save()
    return JsonResponse(get_serialized_state())

@csrf_exempt
@require_http_methods(["POST"])
@transaction.atomic
def reset_auction(request):
    data = {}
    if request.body:
        try:
            data = json.loads(request.body)
        except Exception:
            pass
    reset_type = data.get("type", "all")

    if reset_type == "coins":
        for t in Team.objects.all():
            t.coins = t.starting_coins
            t.save()
    elif reset_type == "players":
        for p in Player.objects.all():
            p.sold_to = None
            p.sold_price = 0
            p.status = "Upcoming"
            p.save()
        BidHistory.objects.all().delete()
        for t in Team.objects.all():
            t.coins = t.starting_coins
            t.captain = ""
            t.save()
        # Set first non-Advanced as live
        settings = AuctionSettings.objects.first()
        if settings:
            first = (
                Player.objects.exclude(category__name__istartswith="Advanced")
                .order_by("auction_order")
                .first()
            ) or Player.objects.order_by("auction_order").first()
            if first:
                first.status = "Live"
                first.save()
                settings.current_player = first
                settings.current_category = first.category
                settings.highest_bid = first.base_price
                settings.highest_bidder = None
                settings.auction_status = "READY"
                settings.timer_remaining = settings.timer
                settings.save()
    elif reset_type == "categories" or reset_type == "all":
        call_command("seed_data")

    return JsonResponse(get_serialized_state())

@csrf_exempt
@transaction.atomic
def bump_bid(request):
    """Operator desk: bump or set the current bid amount without assigning a team yet."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
    except Exception:
        return JsonResponse({"error": "Invalid payload"}, status=400)

    settings = AuctionSettings.objects.first()
    if not settings or not settings.current_player:
        return JsonResponse({"error": "No active player being auctioned"}, status=400)

    base = settings.current_player.base_price
    if "amount" in data and data["amount"] is not None:
        amount = int(data["amount"])
    else:
        increment = int(data.get("increment", 10))
        amount = settings.highest_bid + increment

    if amount < base:
        return JsonResponse({"error": f"Bid cannot be lower than base price of {base}"}, status=400)

    settings.highest_bid = amount
    settings.save()
    return JsonResponse(get_serialized_state())

@csrf_exempt
@transaction.atomic
def place_bid(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        team_id = data.get("team_id")
        amount = int(data.get("amount", 0))
    except Exception as e:
        return JsonResponse({"error": "Invalid payload"}, status=400)

    settings = AuctionSettings.objects.first()
    if not settings or not settings.current_player:
        return JsonResponse({"error": "No active player being auctioned"}, status=400)

    team = get_object_or_404(Team, id=team_id)

    # Operator desk: allow assigning/reassigning the winning team at the current price
    if amount < settings.highest_bid:
        return JsonResponse({"error": f"Bid must be at least the current bid of {settings.highest_bid}"}, status=400)
    
    if amount < settings.current_player.base_price:
        return JsonResponse({"error": f"Bid cannot be lower than base price of {settings.current_player.base_price}"}, status=400)

    if team.coins < amount:
        return JsonResponse({"error": f"Not enough coins! {team.name} has only {team.coins} remaining."}, status=400)

    # Already leading at this exact amount — no-op success
    if settings.highest_bidder_id == team.id and settings.highest_bid == amount:
        return JsonResponse(get_serialized_state())

    settings.highest_bid = amount
    settings.highest_bidder = team
    if settings.timer_remaining < 10:
        settings.timer_remaining = 15
    settings.save()

    BidHistory.objects.create(
        player=settings.current_player,
        team=team,
        amount=amount
    )

    return JsonResponse(get_serialized_state())

def load_next_player(settings, current_player):
    # Try next upcoming in same category
    next_p = Player.objects.filter(category=current_player.category, status="Upcoming").order_by("auction_order").first()
    if not next_p:
        # Try any upcoming
        next_p = Player.objects.filter(status="Upcoming").order_by("auction_order").first()

    if next_p:
        next_p.status = "Live"
        next_p.save()
        settings.current_player = next_p
        settings.current_category = next_p.category
        settings.highest_bid = next_p.base_price
        settings.highest_bidder = None
        settings.timer_remaining = settings.timer
    else:
        settings.current_player = None
        settings.current_category = None
        settings.highest_bid = 0
        settings.highest_bidder = None
        settings.auction_status = "COMPLETED"
    settings.save()

@csrf_exempt
@transaction.atomic
def sell_player(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    settings = AuctionSettings.objects.first()
    if not settings or not settings.current_player:
        return JsonResponse({"error": "No active player to sell"}, status=400)

    player = settings.current_player
    winning_team = settings.highest_bidder
    price = settings.highest_bid

    if not winning_team:
        return JsonResponse({"error": "Cannot sell without a valid highest bidder"}, status=400)

    if winning_team.coins < price:
        return JsonResponse({"error": "Winning team does not have enough coins"}, status=400)

    # Deduct coins
    winning_team.coins -= price
    winning_team.save()

    # Assign player
    player.sold_to = winning_team
    player.sold_price = price
    player.status = "Sold"
    player.save()

    load_next_player(settings, player)

    return JsonResponse(get_serialized_state())

@csrf_exempt
@transaction.atomic
def mark_unsold(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    
    settings = AuctionSettings.objects.first()
    if not settings or not settings.current_player:
        return JsonResponse({"error": "No active player"}, status=400)

    player = settings.current_player
    player.status = "Unsold"
    player.save()

    load_next_player(settings, player)

    return JsonResponse(get_serialized_state())

@csrf_exempt
@transaction.atomic
def undo_bid(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    settings = AuctionSettings.objects.first()
    if not settings or not settings.current_player:
        return JsonResponse({"error": "No active player"}, status=400)

    last_bid = BidHistory.objects.filter(player=settings.current_player).order_by("-id").first()
    if not last_bid:
        return JsonResponse({"error": "No bids to undo for the current player"}, status=400)

    last_bid.delete()

    prev_bid = BidHistory.objects.filter(player=settings.current_player).order_by("-id").first()
    if prev_bid:
        settings.highest_bid = prev_bid.amount
        settings.highest_bidder = prev_bid.team
    else:
        settings.highest_bid = settings.current_player.base_price
        settings.highest_bidder = None
    settings.save()

    return JsonResponse(get_serialized_state())


@csrf_exempt
@transaction.atomic
def assign_captains(request):
    """Assign Advanced-category players as team captains (sold at base price)."""
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON"}, status=400)

    assignments = data.get("assignments") or []
    if not assignments:
        return JsonResponse({"error": "No assignments provided"}, status=400)

    advanced_qs = Category.objects.filter(name__istartswith="Advanced")
    if not advanced_qs.exists():
        return JsonResponse({"error": "Advanced category not found"}, status=400)

    # Reset any previous Advanced captain sales so re-confirm works
    for player in Player.objects.filter(category__in=advanced_qs, status="Sold"):
        team = player.sold_to
        if team:
            team.coins += player.sold_price or 0
            if team.captain == player.name:
                team.captain = ""
            team.save()
        player.sold_to = None
        player.sold_price = 0
        player.status = "Upcoming"
        player.save()

    used_players = set()
    used_teams = set()

    for item in assignments:
        team_id = item.get("team_id")
        player_id = item.get("player_id")
        if team_id is None or player_id is None:
            return JsonResponse({"error": "Each assignment needs team_id and player_id"}, status=400)
        if team_id in used_teams:
            return JsonResponse({"error": "Each team can only have one captain"}, status=400)
        if player_id in used_players:
            return JsonResponse({"error": "Each captain can only be assigned once"}, status=400)

        team = get_object_or_404(Team, id=team_id)
        player = get_object_or_404(Player, id=player_id)

        cat_name = (player.category.name if player.category else "").lower()
        if not player.category or not cat_name.startswith("advanced"):
            return JsonResponse({"error": f"{player.name} is not an Advanced player"}, status=400)
        if player.status == "Sold" and player.sold_to_id not in (None, team.id):
            return JsonResponse({"error": f"{player.name} is already sold"}, status=400)

        # Captains are assigned free — teams keep full starting coins for the auction
        team.captain = player.name
        team.save()

        player.sold_to = team
        player.sold_price = 0
        player.status = "Sold"
        player.save()

        used_teams.add(team_id)
        used_players.add(player_id)

    # Captains are free — every team enters the auction with full starting coins
    for team in Team.objects.filter(id__in=used_teams):
        team.coins = team.starting_coins
        team.save()

    settings = AuctionSettings.objects.first()
    if settings:
        # Ensure the live desk player is not an Advanced captain
        cur = settings.current_player
        cur_is_advanced = bool(
            cur and cur.category and (cur.category.name or "").lower().startswith("advanced")
        )
        needs_new = (
            not cur
            or cur.status != "Live"
            or cur_is_advanced
        )
        if needs_new:
            if cur and cur.status == "Live" and cur_is_advanced:
                cur.status = "Upcoming"
                cur.save()

            next_player = (
                Player.objects.filter(status="Upcoming")
                .exclude(category__name__istartswith="Advanced")
                .order_by("auction_order")
                .first()
            )
            if not next_player:
                next_player = Player.objects.filter(status="Upcoming").order_by("auction_order").first()

            if next_player:
                next_player.status = "Live"
                next_player.save()
                settings.current_player = next_player
                settings.current_category = next_player.category
                settings.highest_bid = next_player.base_price
                settings.highest_bidder = None
                settings.auction_status = "LIVE"
                settings.timer_remaining = settings.timer
                settings.save()

    return JsonResponse(get_serialized_state())


@csrf_exempt
@transaction.atomic
def undo_sold(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    last_sold = Player.objects.filter(status="Sold").order_by("-id").first()
    if not last_sold:
        return JsonResponse({"error": "No sold players to undo"}, status=400)

    settings = AuctionSettings.objects.first()
    
    # Refund coins
    if last_sold.sold_to:
        last_sold.sold_to.coins += last_sold.sold_price or 0
        last_sold.sold_to.save()

    # If there was a current player, set them back to Upcoming
    if settings and settings.current_player:
        settings.current_player.status = "Upcoming"
        settings.current_player.save()

    last_sold.sold_to = None
    last_sold.sold_price = 0
    last_sold.status = "Live"
    last_sold.save()

    if settings:
        settings.current_player = last_sold
        settings.current_category = last_sold.category
        settings.highest_bid = last_sold.base_price
        settings.highest_bidder = None
        settings.auction_status = "PAUSED"
        settings.save()

    return JsonResponse(get_serialized_state())

# CRUD Endpoints for Teams, Players, Categories, Settings
@csrf_exempt
def teams_list_create(request):
    if request.method == "GET":
        teams = list(Team.objects.values())
        return JsonResponse({"teams": teams})
    elif request.method == "POST":
        data = json.loads(request.body)
        team = Team.objects.create(
            name=data["name"],
            logo=data.get("logo", "🛡️"),
            color=data.get("color", "#10B981"),
            coins=int(data.get("starting_coins", 5000)),
            starting_coins=int(data.get("starting_coins", 5000)),
            captain=data.get("captain", ""),
            coach=data.get("coach", "")
        )
        return JsonResponse(get_serialized_state())

@csrf_exempt
def team_detail(request, id):
    team = get_object_or_404(Team, id=id)
    if request.method == "PUT":
        data = json.loads(request.body)
        team.name = data.get("name", team.name)
        team.logo = data.get("logo", team.logo)
        team.color = data.get("color", team.color)
        if "starting_coins" in data:
            diff = int(data["starting_coins"]) - team.starting_coins
            team.starting_coins = int(data["starting_coins"])
            team.coins += diff
        team.captain = data.get("captain", team.captain)
        team.coach = data.get("coach", team.coach)
        team.save()
        return JsonResponse(get_serialized_state())
    elif request.method == "DELETE":
        # Release all squad players back to Unsold pool before deleting team
        for player in team.squad.all():
            player.sold_to = None
            player.sold_price = 0
            player.status = "Unsold"
            player.save()
        team.delete()
        return JsonResponse(get_serialized_state())

@csrf_exempt
def players_list_create(request):
    if request.method == "GET":
        players = list(Player.objects.values())
        return JsonResponse({"players": players})
    elif request.method == "POST":
        data = json.loads(request.body)
        cat = Category.objects.filter(id=data.get("category_id")).first()
        # default svg avatar helper
        initials = "".join([part[0] for part in data["name"].split()[:2]]) if "name" in data else "PL"
        bg = data.get("color", "%233B82F6")
        photo = data.get("photo") or (
            f"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'>"
            f"<rect width='200' height='200' rx='20' fill='{bg}'/>"
            f"<text x='50%' y='55%' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='64' font-weight='bold' fill='%23FFFFFF'>{initials}</text>"
            f"</svg>"
        )
        player = Player.objects.create(
            name=data["name"],
            photo=photo,
            category=cat,
            base_price=int(data.get("base_price", 100)),
            status=data.get("status", "Upcoming"),
            ranking=int(data.get("ranking", 0)),
            seed=int(data.get("seed", 0)),
            auction_order=Player.objects.count() + 1
        )
        return JsonResponse(get_serialized_state())

@csrf_exempt
def player_detail(request, id):
    player = get_object_or_404(Player, id=id)
    if request.method == "PUT":
        data = json.loads(request.body)
        player.name = data.get("name", player.name)
        if "category_id" in data:
            player.category = Category.objects.filter(id=data["category_id"]).first()
        player.base_price = int(data.get("base_price", player.base_price))
        player.ranking = int(data.get("ranking", player.ranking))
        player.seed = int(data.get("seed", player.seed))
        if "photo" in data and data["photo"]:
            player.photo = data["photo"]
        
        if "status" in data:
            new_status = data["status"]
            if new_status == "Live":
                settings = AuctionSettings.objects.first()
                if settings:
                    if settings.current_player and settings.current_player.id != player.id:
                        if settings.highest_bidder is not None:
                            return JsonResponse({
                                "error": f"Cannot switch player! Bidding is currently active for {settings.current_player.name} (Highest bid: {settings.highest_bid} coins by {settings.highest_bidder.name}). Please finish by marking SOLD or UNSOLD first."
                            }, status=400)
                        if settings.current_player.status == "Live":
                            settings.current_player.status = "Upcoming"
                            settings.current_player.save()
                    player.status = "Live"
                    player.save()
                    settings.current_player = player
                    settings.highest_bid = player.base_price
                    settings.highest_bidder = None
                    settings.timer_remaining = settings.timer
                    if settings.auction_status == "COMPLETED":
                        settings.auction_status = "LIVE"
                    settings.save()
                else:
                    player.status = new_status
                    player.save()
            else:
                player.status = new_status
                player.save()
        else:
            player.save()
            
        return JsonResponse(get_serialized_state())
    elif request.method == "DELETE":
        if player.status == "Sold":
            return JsonResponse({"error": "Cannot delete a player that is already sold."}, status=400)
        player.delete()
        return JsonResponse(get_serialized_state())

@csrf_exempt
def categories_list_create(request):
    if request.method == "GET":
        cats = list(Category.objects.values())
        return JsonResponse({"categories": cats})
    elif request.method == "POST":
        data = json.loads(request.body)
        cat = Category.objects.create(
            name=data["name"],
            color=data.get("color", "#3B82F6"),
            player_limit=int(data.get("player_limit", 6)),
            display_order=Category.objects.count() + 1
        )
        return JsonResponse(get_serialized_state())

@csrf_exempt
def category_detail(request, id):
    cat = get_object_or_404(Category, id=id)
    if request.method == "PUT":
        data = json.loads(request.body)
        cat.name = data.get("name", cat.name)
        cat.color = data.get("color", cat.color)
        cat.player_limit = int(data.get("player_limit", cat.player_limit))
        cat.save()
        return JsonResponse(get_serialized_state())
    elif request.method == "DELETE":
        if cat.players.exists():
            return JsonResponse({"error": f"Cannot delete category '{cat.name}' because players belong to it."}, status=400)
        cat.delete()
        return JsonResponse(get_serialized_state())

@csrf_exempt
def settings_detail(request):
    settings = AuctionSettings.objects.first()
    if not settings:
        settings = AuctionSettings.objects.create()
    if request.method == "GET":
        return JsonResponse(get_serialized_state())
    elif request.method == "PUT":
        data = json.loads(request.body)
        settings.auction_name = data.get("auction_name", settings.auction_name)
        settings.tournament_name = data.get("tournament_name", settings.tournament_name)
        settings.sport_name = data.get("sport_name", settings.sport_name)
        settings.starting_coins = int(data.get("starting_coins", settings.starting_coins))
        settings.timer = int(data.get("timer", settings.timer))
        if "bid_increments" in data:
            if isinstance(data["bid_increments"], list):
                settings.bid_increments = ",".join(str(x) for x in data["bid_increments"])
            else:
                settings.bid_increments = data["bid_increments"]
        settings.currency_name = data.get("currency_name", settings.currency_name)
        settings.currency_icon = data.get("currency_icon", settings.currency_icon)
        settings.save()
        return JsonResponse(get_serialized_state())

@csrf_exempt
def export_json(request):
    return JsonResponse(get_serialized_state(), json_dumps_params={"indent": 2})

@csrf_exempt
def export_csv(request):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = 'attachment; filename="basch_auction_results.csv"'
    writer = csv.writer(response)
    writer.writerow(["Player Name", "Category", "Sold Team", "Sold Price", "Base Price", "Status"])
    for p in Player.objects.all().order_by("category__name", "name"):
        writer.writerow([
            p.name,
            p.category.name if p.category else "-",
            p.sold_to.name if p.sold_to else "-",
            p.sold_price or 0,
            p.base_price,
            p.status
        ])
    return response

@csrf_exempt
@transaction.atomic
def import_json(request):
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)
    try:
        data = json.loads(request.body)
        # Clear existing
        BidHistory.objects.all().delete()
        Player.objects.all().delete()
        Team.objects.all().delete()
        Category.objects.all().delete()
        AuctionSettings.objects.all().delete()

        cats_map = {}
        for c in data.get("categories", []):
            cat_obj = Category.objects.create(
                id=c.get("id"),
                name=c["name"],
                color=c.get("color", "#3B82F6"),
                player_limit=c.get("player_limit", 6),
                display_order=c.get("display_order", 0)
            )
            cats_map[c.get("id")] = cat_obj

        teams_map = {}
        for t in data.get("teams", []):
            team_obj = Team.objects.create(
                id=t.get("id"),
                name=t["name"],
                logo=t.get("logo", "🛡️"),
                color=t.get("color", "#10B981"),
                coins=t.get("coins", 5000),
                starting_coins=t.get("starting_coins", 5000),
                captain=t.get("captain", ""),
                coach=t.get("coach", "")
            )
            teams_map[t.get("id")] = team_obj

        for p in data.get("players", []):
            cat = cats_map.get(p.get("category_id"))
            sold_team = teams_map.get(p.get("sold_to_id"))
            Player.objects.create(
                id=p.get("id"),
                name=p["name"],
                photo=p.get("photo", ""),
                category=cat,
                base_price=p.get("base_price", 100),
                sold_price=p.get("sold_price", 0),
                sold_to=sold_team,
                status=p.get("status", "Upcoming"),
                ranking=p.get("ranking", 0),
                seed=p.get("seed", 0),
                auction_order=p.get("auction_order", 0)
            )

        s = data.get("settings", {})
        AuctionSettings.objects.create(
            auction_name=s.get("auction_name", "BASCH Tournament Auction Console"),
            tournament_name=s.get("tournament_name", "Grand Slam Tennis Championship"),
            sport_name=s.get("sport_name", "Lawn Tennis"),
            starting_coins=s.get("starting_coins", 5000),
            timer=s.get("timer", 30),
            bid_increments=",".join(str(x) for x in s.get("bid_increments", [10,20,50,100])),
            currency_name=s.get("currency_name", "Coins"),
            currency_icon=s.get("currency_icon", "💰"),
            current_category=cats_map.get(s.get("current_category_id")),
            current_player=Player.objects.filter(id=s.get("current_player_id")).first(),
            highest_bid=s.get("highest_bid", 0),
            highest_bidder=teams_map.get(s.get("highest_bidder_id")),
            timer_remaining=s.get("timer_remaining", 30),
            auction_status=s.get("auction_status", "READY")
        )
        return JsonResponse(get_serialized_state())
    except Exception as e:
        return JsonResponse({"error": f"Failed to import JSON: {str(e)}"}, status=400)
