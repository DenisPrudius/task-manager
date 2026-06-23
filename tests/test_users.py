USER = {"email": "alice@test.com", "username": "alice", "password": "secret123"}


def test_register_success(client):
    r = client.post("/users/register", json=USER)
    assert r.status_code == 201
    body = r.json()
    assert body["email"] == USER["email"]
    assert body["username"] == USER["username"]
    assert "hashed_password" not in body


def test_register_duplicate_email(client):
    client.post("/users/register", json=USER)
    r = client.post(
        "/users/register",
        json={**USER, "username": "other"},
    )
    assert r.status_code == 409


def test_register_duplicate_username(client):
    client.post("/users/register", json=USER)
    r = client.post(
        "/users/register",
        json={**USER, "email": "other@test.com"},
    )
    assert r.status_code == 409


def test_login_success(client):
    client.post("/users/register", json=USER)
    r = client.post(
        "/users/login",
        data={"username": USER["username"], "password": USER["password"]},
    )
    assert r.status_code == 200
    assert "access_token" in r.json()
    assert r.json()["token_type"] == "bearer"


def test_login_wrong_password(client):
    client.post("/users/register", json=USER)
    r = client.post(
        "/users/login",
        data={"username": USER["username"], "password": "wrong"},
    )
    assert r.status_code == 401


def test_me(client):
    client.post("/users/register", json=USER)
    token = client.post(
        "/users/login",
        data={"username": USER["username"], "password": USER["password"]},
    ).json()["access_token"]
    r = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["username"] == USER["username"]


def test_me_unauthorized(client):
    r = client.get("/users/me")
    assert r.status_code == 401
